interface ScrapedData {
    title: string;
    description: string;
    content: string;
    keywords: string[];
    ogData: {
        title?: string;
        description?: string;
        image?: string;
        type?: string;
    };
    links: string[];
    headings: string[];
}
export declare class WebScraperService {
    private userAgent;
    scrapeWebsite(url: string): Promise<ScrapedData>;
    private normalizeUrl;
    private extractTitle;
    private extractDescription;
    private extractKeywords;
    private extractOpenGraph;
    private extractMainContent;
    private extractLinks;
    private extractHeadings;
}
export declare const webScraperService: WebScraperService;
export {};
//# sourceMappingURL=webScraper.d.ts.map