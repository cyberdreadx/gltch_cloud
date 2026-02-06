"""
GLTCH Cloud - Web Search Tool
DuckDuckGo search integration for GLTCH
"""

import httpx
from typing import List, Dict, Optional
import re


async def search_web(query: str, num_results: int = 5) -> List[Dict]:
    """
    Search the web using DuckDuckGo HTML.
    Returns list of results with title, url, and snippet.
    """
    try:
        # Use DuckDuckGo HTML search (no API key needed)
        url = "https://html.duckduckgo.com/html/"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                data={"q": query},
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
                timeout=10.0
            )
            
            if response.status_code != 200:
                return []
            
            html = response.text
            results = parse_ddg_results(html, num_results)
            return results
            
    except Exception as e:
        print(f"Search error: {e}")
        return []


def parse_ddg_results(html: str, max_results: int) -> List[Dict]:
    """Parse DuckDuckGo HTML results"""
    results = []
    
    # Simple regex parsing for result links
    # Pattern for result titles and URLs
    link_pattern = r'<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)</a>'
    snippet_pattern = r'<a class="result__snippet"[^>]*>([^<]+(?:<[^>]+>[^<]*</[^>]+>)*[^<]*)</a>'
    
    links = re.findall(link_pattern, html)
    snippets = re.findall(snippet_pattern, html)
    
    for i, (url, title) in enumerate(links[:max_results]):
        snippet = snippets[i] if i < len(snippets) else ""
        # Clean HTML from snippet
        snippet = re.sub(r'<[^>]+>', '', snippet).strip()
        
        # Skip DDG redirect URLs, extract actual URL
        if "uddg=" in url:
            actual_url = re.search(r'uddg=([^&]+)', url)
            if actual_url:
                from urllib.parse import unquote
                url = unquote(actual_url.group(1))
        
        results.append({
            "title": title.strip(),
            "url": url,
            "snippet": snippet[:200] + "..." if len(snippet) > 200 else snippet
        })
    
    return results


def format_search_results(results: List[Dict]) -> str:
    """Format search results for chat display"""
    if not results:
        return "No results found."
    
    formatted = "🔍 **Search Results:**\n\n"
    for i, r in enumerate(results, 1):
        formatted += f"**{i}. {r['title']}**\n"
        formatted += f"   {r['snippet']}\n"
        formatted += f"   🔗 {r['url']}\n\n"
    
    return formatted


async def search_and_summarize(query: str) -> str:
    """Search web and return formatted results"""
    results = await search_web(query)
    return format_search_results(results)
