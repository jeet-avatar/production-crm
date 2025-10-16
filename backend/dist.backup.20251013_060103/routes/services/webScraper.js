"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webScraperService = exports.WebScraperService = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const readability_1 = require("@mozilla/readability");
const jsdom_1 = require("jsdom");
class WebScraperService {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (compatible; BrandMonkzBot/1.0; +https://brandmonkz.com)';
    }
    async scrapeWebsite(url) {
        try {
            // Normalize URL
            const normalizedUrl = this.normalizeUrl(url);
            console.log(`🌐 Scraping website: ${normalizedUrl}`);
            // Fetch page
            const response = await axios_1.default.get(normalizedUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml',
                },
                timeout: 15000, // 15 seconds
                maxRedirects: 5
            });
            const html = response.data;
            const $ = cheerio.load(html);
            // Extract meta data
            const title = this.extractTitle($);
            const description = this.extractDescription($);
            const keywords = this.extractKeywords($);
            const ogData = this.extractOpenGraph($);
            // Extract content using Readability
            const content = this.extractMainContent(html, normalizedUrl);
            // Extract links and headings
            const links = this.extractLinks($, normalizedUrl);
            const headings = this.extractHeadings($);
            console.log(`✅ Successfully scraped: ${normalizedUrl}`);
            return {
                title,
                description,
                content,
                keywords,
                ogData,
                links,
                headings
            };
        }
        catch (error) {
            console.error('Web scraping error:', error.message);
            throw new Error(`Failed to scrape ${url}: ${error.message}`);
        }
    }
    normalizeUrl(url) {
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        // Remove trailing slash
        return url.replace(/\/$/, '');
    }
    extractTitle($) {
        return $('title').first().text().trim() ||
            $('meta[property="og:title"]').attr('content') ||
            $('h1').first().text().trim() ||
            '';
    }
    extractDescription($) {
        return $('meta[name="description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="twitter:description"]').attr('content') ||
            '';
    }
    extractKeywords($) {
        const keywordsStr = $('meta[name="keywords"]').attr('content') || '';
        return keywordsStr
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
    }
    extractOpenGraph($) {
        return {
            title: $('meta[property="og:title"]').attr('content'),
            description: $('meta[property="og:description"]').attr('content'),
            image: $('meta[property="og:image"]').attr('content'),
            type: $('meta[property="og:type"]').attr('content'),
        };
    }
    extractMainContent(html, url) {
        try {
            const dom = new jsdom_1.JSDOM(html, { url });
            const reader = new readability_1.Readability(dom.window.document);
            const article = reader.parse();
            return article?.textContent || '';
        }
        catch (error) {
            console.warn('Readability extraction failed, using fallback');
            return '';
        }
    }
    extractLinks($, baseUrl) {
        const links = [];
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (href) {
                try {
                    const absoluteUrl = new URL(href, baseUrl).href;
                    links.push(absoluteUrl);
                }
                catch (e) {
                    // Invalid URL, skip
                }
            }
        });
        return [...new Set(links)].slice(0, 50); // Limit to 50 unique links
    }
    extractHeadings($) {
        const headings = [];
        $('h1, h2, h3').each((_, el) => {
            const text = $(el).text().trim();
            if (text)
                headings.push(text);
        });
        return headings.slice(0, 20); // Limit to 20 headings
    }
}
exports.WebScraperService = WebScraperService;
exports.webScraperService = new WebScraperService();
