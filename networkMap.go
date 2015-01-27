package main

import (
	"flag"
	"fmt"
	"html/template"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"os/exec"
	"strings"
)

var(
	addr = flag.Bool("addr", false, "find open address and print to final-port.txt")
	templates = template.Must(template.ParseFiles("templates/tableView.html"))
	region = "ap-northeast-1"
)

type test_struct struct {
    Test string
}

func renderAWSTemplate(w http.ResponseWriter, tmpl string){
	err := templates.ExecuteTemplate(w, tmpl+".html", nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	//fmt.Fprintf(w, "<script type='text/javascript'>var json=%s;</script>", json)
}

func snapshotsHandler(w http.ResponseWriter, r *http.Request){
	cmd := exec.Command("/bin/bash", "-c", "aws ec2 describe-snapshots --owner self --region "+region)
	out, err := cmd.Output()

	if err != nil {
		fmt.Fprintf(w, "<h1>Error</h1><div>%s</div>", err)
		return
	}
	fmt.Fprintf(w, "%s", out)
	//fmt.print(string(out))
}

func vpcsHandler(w http.ResponseWriter, r *http.Request){
	//read incoming region
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }

    if len(body) != 0{
    	region = strings.SplitAfter(string(body), "region=")[1]
    }

    //load shit
	cmd := exec.Command("/bin/bash", "-c", "aws ec2 describe-vpcs --region "+region)
	
	out, err := cmd.Output()

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Fprintf(w, "%s", out)

}

func homePageHandler(w http.ResponseWriter, r *http.Request){
	renderAWSTemplate(w, "tableView")
	//fmt.Fprintf(w, "<script type='text/javascript' src='/js/jquery-2.1.3.min.js'></script><script type='text/javascript'>var json=%s;</script><script type='text/javascript' src='/js/app.js'></script>", out)
	//fmt.print(string(out))
}

func getVpcHandler(w http.ResponseWriter, r *http.Request){
	cmd := exec.Command("/bin/bash", "-c", "aws ec2 describe-subnets --region "+region)
	out, err := cmd.Output()

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Fprintf(w, "%s", out)
}

func getSubnetHandler(w http.ResponseWriter, r *http.Request){
	cmd := exec.Command("/bin/bash", "-c", "aws ec2 describe-instances --region "+region)
	out, err := cmd.Output()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Fprintf(w, "%s", out)
}

func getVolumeHandler(w http.ResponseWriter, r *http.Request){
	cmd := exec.Command("/bin/bash", "-c", "aws ec2 describe-volumes --region "+region)
	out, err := cmd.Output()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Fprintf(w, "%s", out)
}

func main() {
	flag.Parse()
	http.HandleFunc("/", homePageHandler)
	http.HandleFunc("/getvpcs/", vpcsHandler)
	http.HandleFunc("/getsnapshots/", snapshotsHandler)
	http.HandleFunc("/getsubnet/", getSubnetHandler)
	http.HandleFunc("/getvolumes/", getVolumeHandler)
	http.HandleFunc("/getvpc/", getVpcHandler)
	http.HandleFunc("/js/", func(w http.ResponseWriter, r *http.Request) {
	    http.ServeFile(w, r, r.URL.Path[1:])
	})
	http.HandleFunc("/css/", func(w http.ResponseWriter, r *http.Request) {
	    http.ServeFile(w, r, r.URL.Path[1:])
	})
	http.HandleFunc("/img/", func(w http.ResponseWriter, r *http.Request) {
	    http.ServeFile(w, r, r.URL.Path[1:])
	})

	if *addr {
        l, err := net.Listen("tcp", "127.0.0.1:0")
        if err != nil {
            log.Fatal(err)
        }
        err = ioutil.WriteFile("final-port.txt", []byte(l.Addr().String()), 0644)
        if err != nil {
            log.Fatal(err)
        }
        s := &http.Server{}
        s.Serve(l)
        return
    }
	http.ListenAndServe(":8080", nil)
}
