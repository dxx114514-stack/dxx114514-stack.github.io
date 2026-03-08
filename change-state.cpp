#include<bits/stdc++.h>
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
    cout<<"更改到：\n1.停止\n2.开始";
    int a;
    cin>>a;
    ofstream fout("Server_State.html");
    fout<<"<html><head><title>Server_State</title></head><body>";
    if(a==1){
        fout<<"<h1 style=\"color:red;\">服务器已停止</h1>";
    }else{
        str code;
        cout<<"输入邀请码："<<endl;
        cin>>code;
        cout<<"输入版本："<<endl;
        str khd;
        cin>>khd;
        fout<<"<h1 style=\"color:green;\">服务器已启动</h1><br>邀请码（PCL-CE、HMCL、FCL等基于easytier）：<br>"+code+"<br>版本："+khd;
    }
    fout<<"</body></html>";
    return 0;
}