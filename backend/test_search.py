"""Test script for web search module."""
import asyncio
from backend.search import perform_web_search

def test_search():
    print("Testing web search...")
    query = "Who won the Super Bowl in 2024?"
    print(f"Query: {query}")
    
    results = perform_web_search(query, max_results=2)
    
    print("\nResults:")
    print(results)
    
    if "Result 1" in results and "Title:" in results:
        print("\nSUCCESS: Search returned formatted results.")
    else:
        print("\nFAILURE: Search did not return expected format.")

if __name__ == "__main__":
    test_search()
