var debug,
instances,
subnet,
volumes,
snapshots;

var today = new Date();
var yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
var lastMonth = new Date();
lastMonth.setMonth(lastMonth.getMonth() - 1);
var lastYear = new Date();
lastYear.setYear(lastYear.getYear() - 1);

jQuery( document ).ready(function() {
	
	var SortByIP = function (a, b){
		if(a.Instances[0].State.Name === "terminated"){
			aa = 0;
		} else {
			aa = a.Instances[0].PrivateIpAddress.split(".");
		}

		if(b.Instances[0].State.Name === "terminated"){
			bb = 0;
		} else {
			bb = b.Instances[0].PrivateIpAddress.split(".");
		}
	
        var resulta = aa[0]*0x1000000 + aa[1]*0x10000 + aa[2]*0x100 + aa[3]*1;
        var resultb = bb[0]*0x1000000 + bb[1]*0x10000 + bb[2]*0x100 + bb[3]*1;
	
		return resulta-resultb;
	};

	var loadVPCs = function(region){
		jQuery("body").html("<h1>VPCS</h1><select id='regionSelect' disabled><option value='us-east-1'>US East (N. Virginia)</option><option value='us-west-2'>US West (Oregon)</option><option value='us-west-1'>US West (N. California)</option><option value='eu-west-1'>EU (Ireland)</option><option value='eu-central-1'>EU (Frankfurt)</option><option value='ap-southeast-1'>Asia Pacific (Singapore)</option><option value='ap-northeast-1'>Asia Pacific (Tokyo)</option><option value='ap-southeast-2'>Asia Pacific (Sydney)</option><option value='sa-east-1'>South America (Sao Paulo)</option></select><div id='main'></div><div id='lightbox'></div>");
		jQuery("#regionSelect").attr("disabled","disabled").val(region);
		jQuery.post( "/getvpcs/", {"region":region})
			.done(function(data) {
				subnets = jQuery.parseJSON(data);
				renderVPC(jQuery.parseJSON(data));
				loadSubnets();
			});
	};

	var loadSubnets = function (){
		jQuery.post( "/getvpc/")
			.done(function(data) {
				subnets = jQuery.parseJSON(data);
				renderSubnets(subnets);
				loadInstances();
			});
	};

	var loadInstances = function (){
		jQuery.post( "/getsubnet/")
			.done(function(data) {
				instances = jQuery.parseJSON(data);
				renderInstances(instances);
				loadVolumes();
			});
	};

	var loadVolumes = function (){
		jQuery.post( "/getvolumes/")
			.done(function(data) {
				volumes = jQuery.parseJSON(data);
				renderVolumes(volumes);
				loadSnapshots();
			});
	};

	var loadSnapshots = function(){
		jQuery.post( "/getsnapshots/")
			.done(function(data) {
				snapshots = jQuery.parseJSON(data);
				renderSnapshots(snapshots);
			});
	};
	
	var renderVPC = function(data){
		jQuery(data.Vpcs).each(function(){
			jQuery("#main").append("<fieldset id=" + this.VpcId + "><legend class='vpcid'>" + this.VpcId + "</legend></fieldset>");
		});
		jQuery("#main").append("<div id='lostAndFound'><h2>Lost And Found</h2><table></table></div>");

		jQuery("#regionSelect").on('change', function() {
			loadVPCs(jQuery(this).val());
		});
	};

	var renderSubnets = function(data){
		jQuery(data.Subnets).each(function(){
			var html = "<div class='subnet' rel='" + this.SubnetId + "'><h2>" + this.CidrBlock + "</h2></div>";
			VpcId = this.VpcId;
			jQuery("fieldset#" + VpcId).append(html);
		});
		debug=data;
	};

	var renderInstances = function(data){
		var instance, name = "", html;
		data.Reservations.sort(SortByIP);
		jQuery(data.Reservations).each(function(){
			instance = this.Instances[0];
			for(var tag in instance.Tags){
				if(instance.Tags[tag].Key==="Name"){
					name = instance.Tags[tag].Value;
				}
			}
			html = "<div class='instance " + instance.State.Name + "' rel='" + instance.InstanceId + "'><h3>" + name + "<span>"+ instance.PrivateIpAddress +"</span></h3><p>" + instance.InstanceType + "</p>";

			html+="<table class='tags'>";
			jQuery(instance.Tags).each(function(){
				html+="<tr><td class='key'>" + this.Key + ":</td><td>" + this.Value + "</td></tr>";
			});
			html+="</table>";

			html+="<div class='volumes'></div></div>";

			SubnetId = instance.SubnetId;

			if(jQuery("div[rel="+SubnetId+"]").length!==0){
				jQuery("div[rel="+SubnetId+"]").append(html);
			} else {
				jQuery("div#lostAndFound").append(html);
			}

		});
		debug=data;
	};

	var renderVolumes = function(data) {
		var html, attachedInstance;
		jQuery(volumes.Volumes).each(function(){
			html = "<div class='volume' rel="+this.VolumeId+" data-featherlight='#lightbox'>" + this.Size + "</div>";
			if (this.Attachments[0]) {
				attachedInstance = this.Attachments[0].InstanceId;
			} else{
				attachedInstance = "unattached";
			}

			if(jQuery("div[rel="+attachedInstance+"]").length!==0){
				jQuery("div[rel="+attachedInstance+"] > div.volumes").append(html);
			} else {
				jQuery("div#lostAndFound").append(html);
			}
		});
	};

	var renderSnapshots = function(data) {
		var SnapshotArray = {};
		jQuery(data.Snapshots).each(function(){
			if(SnapshotArray[this.VolumeId]){
				++SnapshotArray[this.VolumeId].number;
				if(this.StartTime > SnapshotArray[this.VolumeId].date){
					SnapshotArray[this.VolumeId].date = this.StartTime;
				}
			} else {
				SnapshotArray[this.VolumeId] = {number:1, date:this.StartTime};
			}
		});
		for(var vol in SnapshotArray){
			var snapAge="", LatestSnapDate=new Date(SnapshotArray[vol].date);
			if (LatestSnapDate > yesterday){
				snapAge = "day";
			} else if (LatestSnapDate > lastMonth) {
				snapAge = "month";
			} else if (LatestSnapDate > lastYear) {
				snapAge = "year";
			} else {
				snapAge = "outofdate";
			}
			if(jQuery("div[rel="+vol+"]").length!==0){
				jQuery("div[rel="+vol+"]").append("<span class='snapCount'>" + SnapshotArray[vol].number + "</span>").addClass(snapAge).attr("title", "Snapshot within last " + snapAge);
			} else {
				jQuery("div#lostAndFound > table").append("<tr class='snap'><td class='name'>" + vol + "</td><td class='value'>" + SnapshotArray[vol].number + "</td></tr>");
			}
			
		}
		//add class to all snapshot-less volumes
		jQuery("div.volume:not(:has(span))").addClass("noSnap");
		finishSetup();
	};

	var finishSetup = function(){
		jQuery("#regionSelect").removeAttr("disabled");
	};
	//renderVPC(jQuery.parseJSON(json));
	
	loadVPCs("us-east-1");

	jQuery.featherlight.defaults.beforeOpen = function(el){
		var html = "";
		var selectedVolume = $.grep(volumes.Volumes, function(e){ return e.VolumeId == $(el.currentTarget).attr("rel"); })[0];
		var selectedVolumeSnapshots = $.grep(snapshots.Snapshots, function(e){ return e.VolumeId == $(el.currentTarget).attr("rel"); });

		html+="<h1>"+selectedVolume.VolumeId+"</h1><p>This is a " +selectedVolume.Size+ "GB " +selectedVolume.VolumeType+ " volume.</p>";
		//create snapshot table
		html+="<h2>Snapshot List</h2><table><thead><tr><td>ID</td><td>Description</td><td>Date</td><td>Encrypted</td></tr></thead>";
		jQuery(selectedVolumeSnapshots).each(function(){
			html+="<tr>";
			html+="<td>"+this.SnapshotId+"</td>";
			html+="<td>"+this.Description+"</td>";
			html+="<td>"+this.StartTime+"</td>";
			html+="<td>"+this.Encrypted+"</td>";
			html+="</tr>";
		});
		html+="</table>";

		jQuery("#lightbox").html(html);
	};

});