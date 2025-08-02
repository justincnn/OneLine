import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL not provided' }, { status: 400 });
    }

    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // A simple heuristic to extract product names:
    // Look for h2 or h3 tags that might contain product names.
    // This is very basic and might need to be improved.
    const productHeadings = $('h2, h3');
    const products: string[] = [];
    productHeadings.each((i, el) => {
      products.push($(el).text());
    });
    
    // Another simple heuristic: look for text in the body
    $('body').find('p').each((i, el) => {
        const text = $(el).text();
        // This is a placeholder for a more sophisticated product extraction logic
        if(text.toLowerCase().includes('product')) {
            products.push(text);
        }
    });


    return NextResponse.json({ products });

  } catch (error: any) {
    console.error('Scraping failed:', error);
    return NextResponse.json(
      { error: 'Failed to scrape the website', details: error.message },
      { status: 500 }
    );
  }
}