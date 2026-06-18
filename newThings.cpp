#include <bits/stdc++.h>
#include <cstdlib>
#include <fstream>
#include <string>
using namespace std;
#define ll long long
#define str string
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

    // 3. 创建项目目录
    system(("md \"P" + to_string(p) + "\"").c_str());

    // 4. 更新主页面 (index.html) - 保持 HTML 格式
    ifstream html(".\\docs\\index.html"); 
    ofstream html1(".\\docs\\tmp.html"); 
    
    str tmp;
    while (getline(html, tmp)) {
        html1 << tmp << endl;
        // 在标记处插入新的 HTML 链接 (指向转换后的html文件)
        if (tmp == "<!--video-->") { 
            // 假设 md2html 会将 P1/index.md 转换为 P1_index.html
            html1 << "<a href=\"./P" << to_string(p) << "_index.html\">P" << to_string(p) << ':' << title << "</a><br>\n";
        }
    }
    html.close();
    html1.close();
    
    // 替换原文件
    system("del .\\docs\\index.html");
    system("ren .\\docs\\tmp.html .\\docs\\index.html");

    // 5. 创建项目详情页面 (index.md) - 改为 Markdown 格式
    ofstream index(".\\docs\\P" + to_string(p) + "\\index.md");
    index << "# P" << to_string(p) << ": " << title << "\n\n"; // Markdown 标题
    
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

        if (type == "1") { // 处理代码 (直接展示)
            cout << "输入第" << i << "个资源的语言：";
            str lang;
            cin >> lang;
            
            // ✅ 多行输入：遇到 end 结束
            cout << "输入第" << i << "个资源的内容（输入 end 结束）：\n";
            str content;
            str line;
            cin.ignore(100000, '\n'); // 清除缓冲区
            while (getline(cin, line)) {
                if (line == "end") break;
                content += line + "\n";
            }
            
            // 直接在详情页展示代码
            index << "## " << name << "\n";
            index << "```" << lang << "\n" << content << "```\n\n";
        } 
        else if (type == "2") { // 处理文件 (生成链接)
            cout << "输入第" << i << "个资源的路径：";
            str link;
            cin >> link;
            // 复制文件
            system(("copy \"" + link + "\" \"./docs/P" + to_string(p) + "/" + to_string(i) + link.substr(link.find_last_of('.')) + "\"").c_str());
            
            // 在详情页添加链接
            index << "- [" << name << "](./" << i << link.substr(link.find_last_of('.')) << ")\n\n";
        } 
        else if (type == "3") { // 处理字符串 (直接展示)
            // ✅ 多行输入：遇到 end 结束
            cout << "输入第" << i << "个资源的内容（输入 end 结束）：\n";
            str content;
            str line;
            cin.ignore(100000, '\n'); // 清除缓冲区
            while (getline(cin, line)) {
                if (line == "end") break;
                content += line + "\n";
            }
            
            // 直接在详情页展示文本
            index << "## " << name << "\n";
            index << content << "\n\n";
        } 
        else if (type == "4") { // 处理图片 (生成图片语法)
            cout << "输入第" << i << "个资源的路径：";
            str link;
            cin >> link;
            // 复制图片
            system(("copy \"" + link + "\" \"./docs/P" + to_string(p) + "/" + to_string(i) + link.substr(link.find_last_of('.')) + "\"").c_str());
            
            // 在详情页直接插入图片 (Markdown 语法)
            index << "## " << name << "\n";
            index << "![图片" << i << "](./" << i << link.substr(link.find_last_of('.')) << ")\n\n";
        }
    }
    
    index.close();

    // 7. 运行 md2html.exe 将 md 转换为 html 并存在根目录
    // ✅ 已移除 -i 和 -o，直接传递路径，依赖工具默认配置
    str md_path = ".\\docs\\P" + to_string(p) + "\\index.md";
    system(("md2html.exe \"" + md_path + "\"").c_str());

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