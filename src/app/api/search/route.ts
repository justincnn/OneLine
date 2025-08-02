import { NextResponse } from 'next/server';
import axios from 'axios';

const TAVILY_API_URL = 'https://api.tavily.com/search';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { query, apiKey, search_depth, include_answer, include_images, include_raw_content, max_results, include_domains, exclude_domains } = requestData;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Tavily API key not provided' },
        { status: 400 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Query not provided' },
        { status: 400 }
      );
    }

    const payload = {
      api_key: apiKey,
      query: query,
      search_depth: search_depth || "basic",
      include_answer: include_answer || false,
      include_images: include_images || false,
      include_raw_content: include_raw_content || false,
      max_results: max_results || 5,
      include_domains: include_domains || [],
      exclude_domains: exclude_domains || [],
    };

    console.log(`Sending search request to Tavily: "${query}"`);

    const response = await axios.post(TAVILY_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Tavily's response has a 'results' field which is an array of objects.
    // We can directly return this.
    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error('Tavily API request failed:', error.message);
    
    const errorDetails: {
      error: string;
      message: any;
      query: any;
      status?: number;
      statusText?: string;
      data?: any;
    } = {
      error: 'Tavily search request failed',
      message: error.message,
      query: error.config?.data ? JSON.parse(error.config.data).query : 'unknown',
    };

    if (error.response) {
      errorDetails.status = error.response.status;
      errorDetails.statusText = error.response.statusText;
      errorDetails.data = error.response.data;
    }

    return NextResponse.json(
      {
        ...errorDetails,
        results: [],
        number_of_results: 0
      },
      { status: error.response?.status || 500 }
    );
  }
}
