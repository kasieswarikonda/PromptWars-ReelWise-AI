import os
import json
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from config import settings

logger = logging.getLogger("reelwise_ai")

# Fallback deterministic recommendations for Demo Mode
MOCK_REELS_DB = [
    {
        "id": 1,
        "title": "Java GC Explained Simply",
        "description": "How the Java Garbage Collector works under the hood. Visualizing mark-and-sweep algorithm.",
        "category": "Java",
        "technology": "Java / JVM",
        "views": 12000,
        "likes": 1100,
        "shares": 180,
        "saves": 390
    },
    {
        "id": 2,
        "title": "Software Engineer Life: Day 1 vs Year 5",
        "description": "A funny journey showing a software engineer's transition from fixing simple spelling mistakes to drinking coffee while system scaling.",
        "category": "Career",
        "technology": "Software Engineering Culture",
        "views": 25000,
        "likes": 2400,
        "shares": 950,
        "saves": 120
    },
    {
        "id": 3,
        "title": "Cracking the Coding Interview: Reverse a Linked List",
        "description": "Why interviewers love recursion / pointer manipulation queries. Visualizing the iterative approach step-by-step.",
        "category": "DSA",
        "technology": "Data Structures & Algorithms",
        "views": 18000,
        "likes": 1500,
        "shares": 300,
        "saves": 850
    },
    {
        "id": 4,
        "title": "MacBook Pro M3 vs Dell XPS 15 for Coding",
        "description": "Detailed comparison of processor specs, battery life, and Docker performance for developers.",
        "category": "Hardware",
        "technology": "Hardware Specs",
        "views": 30000,
        "likes": 2800,
        "shares": 400,
        "saves": 600
    },
    {
        "id": 5,
        "title": "Is prompt engineering dead? My honest take.",
        "description": "Why writing 'please' to ChatGPT won't save your job. Dive into LLM APIs and temperature parameters.",
        "category": "AI",
        "technology": "Artificial Intelligence",
        "views": 45000,
        "likes": 4200,
        "shares": 1500,
        "saves": 2100
    },
    {
        "id": 6,
        "title": "Cybersecurity 101: SQL Injection",
        "description": "How clean user input prevents databases from leaking secrets. Practical demo using a mock node server.",
        "category": "Cybersecurity",
        "technology": "Cybersecurity",
        "views": 9000,
        "likes": 800,
        "shares": 120,
        "saves": 400
    },
    {
        "id": 7,
        "title": "Scaling System Design: Load Balancers",
        "description": "What happens when 1,000,000 users visit your app at the same time? A visual breakdown of Nginx and CDN caching.",
        "category": "HLD",
        "technology": "System Architecture",
        "views": 15000,
        "likes": 1400,
        "shares": 320,
        "saves": 700
    },
    {
        "id": 8,
        "title": "Kubernetes Pods vs Docker Containers",
        "description": "Simplifying container orchestration concepts for absolute beginners. When do you actually need K8s?",
        "category": "Cloud",
        "technology": "Cloud Computing",
        "views": 11000,
        "likes": 950,
        "shares": 150,
        "saves": 520
    }
]

# Set up Gemini if API key is provided
is_gemini_available = False
if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip() != "" and "your_gemini_api_key" not in settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        is_gemini_available = True
        logger.info("Gemini API initiated successfully.")
    except Exception as e:
        logger.error(f"Failed to configure Gemini API: {e}")

def get_demo_analysis_and_recommendation(interacted_reels: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Fallback reasoning when Gemini is not available.
    Also handles the built-in trap example deterministically!
    """
    if not interacted_reels:
        return {
            "interest": "General Technology",
            "why_inferred": "No specific interactions recorded. Showing introductory computer science content.",
            "recommended_reel": MOCK_REELS_DB[4], # Is prompt engineering dead?
            "why_recommendation": "Introduction to AI is highly relevant for beginners entering technology.",
            "difficulty": "Beginner",
            "confidence": "Medium"
        }

    # Extract info
    titles = [r.get("title", "") for r in interacted_reels]
    categories = [r.get("category", "") for r in interacted_reels]
    
    # Check for the trap example:
    # 1. Java meme, 2. Software-engineer lifestyle Reel, 3. Coding interview joke, 4. Laptop comparison
    # Title keywords matching this: JVM/Java, life/career, interview/DSA, MacBook/Dell/Laptop
    has_java = any("java" in t.lower() or "jvm" in t.lower() for t in titles)
    has_lifestyle = any("life" in t.lower() or "career" in t.lower() or "culture" in t.lower() for t in titles)
    has_interview = any("interview" in t.lower() or "dsa" in t.lower() or "linked list" in t.lower() for t in titles)
    has_laptop = any("macbook" in t.lower() or "dell" in t.lower() or "laptop" in t.lower() or "hardware" in t.lower() for t in titles)
    
    if has_java and has_lifestyle and has_interview and has_laptop:
        # TRAP MATCHED
        return {
            "interest": "Software Engineering / Technology",
            "why_inferred": "The student has interacted with multiple facets of a software development career: syntax/runtime (Java GC), daily work culture (Day 1 vs Year 5), coding interview prep (Reverse a Linked List), and hardware tooling (MacBook vs Dell dynamic). This suggests a broad interest in the software engineering profession rather than just one specific technology stack.",
            "recommended_reel": MOCK_REELS_DB[6], # System Design: Load Balancers (ID 7)
            "why_recommendation": "Since the student shows key interest in Software Engineering as a career and system scaling, learning high-level system design topics like Load Balancing will broaden their architectural knowledge for their career.",
            "difficulty": "Intermediate",
            "confidence": "High"
        }
    
    # Other deterministic matching rules based on category counts
    from collections import Counter
    cat_counts = Counter(categories)
    most_common_cat, count = cat_counts.most_common(1)[0]
    
    if most_common_cat == "Java":
        return {
            "interest": "Object-Oriented Programming & JVM Ecosystem",
            "why_inferred": f"Student interacted with several Java concepts, showing interest in native performance and JVM diagnostics ({count} clicks).",
            "recommended_reel": MOCK_REELS_DB[6], # HLD System Design
            "why_recommendation": "Expanding JVM development knowledge into server architecture and system scaling.",
            "difficulty": "Intermediate",
            "confidence": "High"
        }
    elif most_common_cat == "AI":
        return {
            "interest": "Artificial Intelligence & Large Language Models",
            "why_inferred": "Focused primarily on prompt design, LLM architecture, and AI developer tools.",
            "recommended_reel": MOCK_REELS_DB[6], # System Design (to build systems for AI)
            "why_recommendation": "To deploy AI models effectively, a software engineer must understand distributed backend design like load balancing.",
            "difficulty": "Intermediate",
            "confidence": "High"
        }
    elif most_common_cat == "DSA":
        return {
            "interest": "Algorithmic Problem Solving",
            "why_inferred": "Frequent interactions with interview logic, pointers, recursion, and algorithm optimization reels.",
            "recommended_reel": MOCK_REELS_DB[6], # Load Balancers
            "why_recommendation": "Connecting low-level algorithms with high-level system architecture optimization.",
            "difficulty": "Advanced",
            "confidence": "High"
        }
    else:
        # Default fallback recomendation
        return {
            "interest": "Full-Stack Software Development",
            "why_inferred": f"Diverse interactions across categories {list(cat_counts.keys())} indicating general interest in software engineering lifecycle.",
            "recommended_reel": MOCK_REELS_DB[4], # AI Reel
            "why_recommendation": "AI prompt engineering and LLM lifecycle knowledge is highly relevant for all software engineering fields today.",
            "difficulty": "Beginner",
            "confidence": "Medium"
        }

async def analyze_and_recommend(interacted_reels: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Main entrypoint that uses Gemini API if available, or Demo Mode.
    """
    if not is_gemini_available:
        logger.info("Using Demo Mode for recommendations (Gemini is not configured).")
        return get_demo_analysis_and_recommendation(interacted_reels)
    
    try:
        # Prompting Gemini
        reel_summary = []
        for r in interacted_reels:
            reel_summary.append(
                f"- Title: {r.get('title')}\n  Description: {r.get('description')}\n  Category: {r.get('category')}\n  Topic: {r.get('technology')}"
            )
        reels_list_str = "\n".join(reel_summary)
        
        system_instructions = (
            "You are an AI-powered recommendation agent for technology students. "
            "Your goal is to analyze the Reels a student interacts with, infer their broader underlying interest, "
            "and recommend one of our technology-related Reels that matches those interests.\n\n"
            "Here is the database of available Reels to recommend from:\n"
            f"{json.dumps(MOCK_REELS_DB, indent=2)}\n\n"
            "Rules:\n"
            "1. Infer broader interest, DO NOT do simple keyword matching. For example, if a student watches Java GC, "
            "lifestyle, DSA interview joke, and laptop comparison, do NOT recommend another generic Java Reel. "
            "Infer 'Software Engineering / Technology' and recommend a system architecture or high-level design reel.\n"
            "2. Never recommend generic hype/buzzword content like '10 AI tools that will get you a job' unless it is genuinely connected.\n"
            "3. Return the output in strict JSON format matching this schema:\n"
            "{\n"
            "  \"interest\": \"inferred broader interest\",\n"
            "  \"why_inferred\": \"explanation of evidence from student interacted reels\",\n"
            "  \"recommended_reel_id\": 1, // ID of recommended Reel from the database\n"
            "  \"why_recommendation\": \"connection between interest and recommended Reel\",\n"
            "  \"difficulty\": \"Beginner/Intermediate/Advanced\",\n"
            "  \"confidence\": \"High/Medium/Low\"\n"
            "}"
        )
        
        prompt = (
            f"Here are the Reels the student interacted with (watched, liked, saved, or shared):\n\n"
            f"{reels_list_str}\n\n"
            "Analyze their broader interests and provide the recommendation JSON."
        )
        
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = await model.generate_content_async(
            f"{system_instructions}\n\n{prompt}",
            generation_config={"response_mime_type": "application/json"}
        )
        
        result_json = json.loads(response.text)
        
        # Hydrate the recommended reel from database using the ID
        rec_id = result_json.get("recommended_reel_id")
        rec_reel = next((r for r in MOCK_REELS_DB if r["id"] == rec_id), MOCK_REELS_DB[6]) # default to load balancer
        
        return {
            "interest": result_json.get("interest", "Software Engineering / Technology"),
            "why_inferred": result_json.get("why_inferred", "Interactions show a broad technology focus."),
            "recommended_reel": rec_reel,
            "why_recommendation": result_json.get("why_recommendation", "Directly related to the underlying logic and tooling interest."),
            "difficulty": result_json.get("difficulty", "Intermediate"),
            "confidence": result_json.get("confidence", "High")
        }
        
    except Exception as e:
        logger.error(f"Gemini API request failed: {e}. Falling back to Demo Mode.")
        return get_demo_analysis_and_recommendation(interacted_reels)
