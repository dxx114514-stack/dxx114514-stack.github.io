#include<bits/stdc++.h>
#include <cstdlib>
#include <fstream>
#include <string>
using namespace std;
#define ll long long
#define str string
#define ull unsigned long long
#define vec vector
const ll mod=LLONG_MAX;
#define sysp system("pause");
ll qp(ll d,ll c){
    ll ans=1;
    while(c){
        if(c%2){
            ans=ans*d%mod;
        }
        d=d*d%mod;
        c/=2;
    }
    return ans;
}
int main(){
    cout<<"输入视频标题：";
    str title;
    cin>>title;
    ll p;
    ifstream pnum("pnum.txt");
    pnum>>p;
    p++;
    pnum.close();
    ofstream pnum1("pnum.txt");
    pnum1<<p;
    pnum1.close();
    system(("md \"P"+to_string(p)+"\"").c_str());
    ifstream html("index.html");
    ofstream html1("tmp.html");
    while(html){
        str tmp;
        getline(html,tmp);
        html1<<tmp<<endl;
        if(tmp=="<!--flag-->"){
            html1<<"<a href=\".\\P"+to_string(p)+"\\index.html\">P"+to_string(p)+':'+title+"</a><br>\n";
        }
    }
    html.close();
    html1.close();
    system("del index.html");
    system("ren tmp.html index.html");
    ofstream index("P"+to_string(p)+"\\index.html");
    index<<"<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<title>P"+to_string(p)+':'+title+"</title>\n</head>\n<body>\n<h1>P"+to_string(p)+':'+title+"\
    </h1>\n<br>\n";
    cout<<"输入资源数量：";
    ll n;
    cin>>n;
    for(ll i=1;i<=n;i++){
        cout<<"输入第"<<i<<"个资源的名称：";
        str name;
        cin>>name;
        cout<<"输入第"<<i<<"个资源的路径：";
        str link;
        cin>>link;
        system(("copy \""+link+"\" \"P"+to_string(p)+"\\"+to_string(i)+"."+link.substr(link.find_last_of('.'))+"\"").c_str());
        index<<"<a href=\""<<to_string(i)+link.substr(link.find_last_of('.'))<<"\">"<<name<<"</a><br>\n";
    }
    index<<"</body>\n</html>";
    index.close();
    if(system("git push")==0)cout<<"上传成功"<<endl;
    else cout<<"上传失败"<<endl;
    sysp
    return 0;
}
/*cfsd_f80201482b95c2dc23f84f7e57f1084e
curl -X POST "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=renew" \
-H "X-API-Key: cfsd_xxxxxxxxxx" \
-H "X-API-Secret: yyyyyyyyyyyy" \
-H "Content-Type: application/json" \
-d '{
  "subdomain_id": 3
}'
0cdfb4dce1469f7d058118480910d72dc859334b36393e61cdd751449ad95b4e

*/