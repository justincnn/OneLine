import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'URL not provided' }, { status: 400 });
  }

  const MAX_RETRIES = 3;
  let lastError: any;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000 // 10 seconds timeout
      });
      const html = response.data;
      const $ = cheerio.load(html);

      const productSelectors = [
        '.product-title',
        '.product-name',
        '[itemprop="name"]',
        'h1',
        'h2',
        'h3'
      ];
      
      const products = new Set<string>();

      productSelectors.forEach(selector => {
        $(selector).each((i, el) => {
          const text = $(el).text().trim();
          if (text) {
            products.add(text);
          }
        });
      });

      return NextResponse.json({ products: Array.from(products) });

    } catch (error: any) {
      console.error(`Scraping attempt ${i + 1} failed:`, error.message);
      lastError = error;
      if (i < MAX_RETRIES - 1) {
        await new Promise(res => setTimeout(res, 1000 * (i + 1))); // Exponential backoff
      }
    }
  }

  return NextResponse.json(
    { error: 'Failed to scrape the website after multiple retries', details: lastError.message },
    { status: 500 }
  );
}