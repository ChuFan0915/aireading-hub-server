// 定义爬虫的类型
export interface SearchResult{
    title:string;
    author:string;
    cover:string;
    bookUrl:string;//小说详情页
    desc:string;
    category:string;
    status:string;//状态,是否完结
}
// 章节信息
export interface ChapterInfo{
    title:string;
    index:number;//章节序号
    url:string;//章节url 
}
export interface ChapterContent{
    title:string;//章节标题
    content:string //正文
}
