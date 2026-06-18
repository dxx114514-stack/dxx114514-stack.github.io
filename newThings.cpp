#include <bits/stdc++.h>
#include <cstdlib>
#include <fstream>
#include <string>
using namespace std;
#define ll long long
#define str string

const ll mod = LLONG_MAX;

// 快速幂函数 (保留原结构)
ll qp(ll d, ll c) {
    ll ans = 1;
    while (c) {
        if (c % 2) ans = ans * d % mod;
        d = d * d % mod;
        c /= 2;
    }
    return ans;
}

// ✅ 新增：去除字符串首尾引号的辅助函数
void removeQuotes(str &s) {
    if (!s.empty() && s.front() == '"') s.erase(0, 1);
    if (!s.empty() && s.back() == '"') s.pop_back();
}

int main() {
    system("chcp 65001"); // 设置控制台编码为 UTF-8
    
    // 1. 获取视频标题
    cout << "输入视频标题：";
    str title;
    cin >> title;

    // 2. 读取并更新项目序号 P
    ll p;
    ifstream pnum("pnum.txt");
    pnum >> p;
    pnum.close();
    p++; // 序号+1

    ofstream pnum1("pnum.txt");
    pnum1 << p;
    pnum1.close();

    // 3. 创建项目目录 (✅ 修复: 改用 mkdir)
    system(("mkdir \"P" + to_string(p) + "\"").c_str());

    // 4. 更新主页面 (index.html) - 保持 HTML 格式
    ifstream html(".\\docs\\index.html"); 
    ofstream html1(".\\docs\\tmp.html"); 
    
    str tmp;
    while (getline(html, tmp)) {
        html1 << tmp << endl;
        if (tmp == "<!--video-->") { 
            html1 << "<a href=\"./P" << to_string(p) << "_index.html\">P" << to_string(p) << ':' << title << "</a><br>\n";
        }
    }
    html.close();
    html1.close();
    
    // 替换原文件
    system("del .\\docs\\index.html");
    system("ren .\\docs\\tmp.html .\\docs\\index.html");

    // 5. 创建项目详情页面 (index.md)
    ofstream index(".\\docs\\P" + to_string(p) + "\\index.md");
    index << "# P" << to_string(p) << ": " << title << "\n\n";
    
    // 6. 处理资源
    cout << "输入资源数量：";
    ll n;
    cin >> n;

    for (ll i = 1; i <= n; i++) {
        cout << "输入第" << i << "个资源的类型\n1:代码 2:文件 3:字符串 4:图片：";
        str type;
        cin >> type;

        cout << "输入第" << i << "个资源的名称：";
        str name;
        cin >> name;

        if (type == "1") { // 处理代码
            cout << "输入第" << i << "个资源的语言：";
            str lang;
            cin >> lang;
            
            cout << "输入第" << i << "个资源的内容（输入 end 结束）：\n";
            str content, line;
            cin.ignore(100000, '\n'); 
            while (getline(cin, line)) {
                if (line == "end") break;
                content += line + "\n";
            }
            
            index << "## " << name << "\n";
            index << "```" << lang << "\n" << content << "```\n\n";
        } 
        else if (type == "2") { // 处理文件
            cout << "输入第" << i << "个资源的路径：";
            str link;
            cin >> link;
            removeQuotes(link); // ✅ 修复: 去除引号
            
            str ext = link.substr(link.find_last_of('.'));
            system(("copy \"" + link + "\" \"./docs/P" + to_string(p) + "/" + to_string(i) + ext + "\"").c_str());
            
            index << "- [" << name << "](./" << i << ext << ")\n\n";
        } 
        else if (type == "3") { // 处理字符串
            cout << "输入第" << i << "个资源的内容（输入 end 结束）：\n";
            str content, line;
            cin.ignore(100000, '\n'); 
            while (getline(cin, line)) {
                if (line == "end") break;
                content += line + "\n";
            }
            
            index << "## " << name << "\n";
            index << content << "\n\n";
        } 
        else if (type == "4") { // 处理图片
            cout << "输入第" << i << "个资源的路径：";
            str link;
            cin >> link;
            removeQuotes(link); // ✅ 修复: 去除引号
            
            str ext = link.substr(link.find_last_of('.'));
            system(("copy \"" + link + "\" \"./docs/P" + to_string(p) + "/" + to_string(i) + ext + "\"").c_str());
            
            index << "## " << name << "\n";
            index << "![" << name << "](./" << i << ext << ")\n\n";
        }
        else { // ✅ 修复: 非法类型拦截
            cout << "⚠️ 无效的资源类型，已跳过第" << i << "个资源！\n\n";
        }
    }
    
    index.close();

    // 7. 运行 md2html.exe (✅ 修复: 加上 .\ 确保在当前目录查找)
    str md_path = ".\\docs\\P" + to_string(p) + "\\index.md";
    system((".\\md2html.exe \"" + md_path + "\"").c_str());

    // 8. Git 提交
    system("git add .");
    system(("git commit -m \"add P" + to_string(p) + "\"").c_str());
    if (system("git push") == 0)
        cout << "上传成功" << endl;
    else
        cout << "上传失败" << endl;

    system("pause");
    return 0;
}