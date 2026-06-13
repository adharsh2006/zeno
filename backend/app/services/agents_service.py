from typing import Dict, Any, List, TypedDict
from langgraph.graph import StateGraph, END
import re
import json
import logging
import os
from app.core.config import settings

# Setup logging
logger = logging.getLogger("backend.agents_service")

# State definition
class AgentState(TypedDict):
    prompt: str
    rules: Dict[str, Any]
    channel: str
    content: str
    explanation: str
    errors: List[str]

# 1. Audience Agent Node
def audience_agent(state: AgentState) -> AgentState:
    logger.info("Running Audience Agent...")
    prompt = state["prompt"].lower()
    rules = {}
    explanation_parts = []

    # Heuristic/regex parser for zero-config fallback
    if "inactive" in prompt or "dormant" in prompt or "churn" in prompt or "haven't ordered" in prompt:
        days = 30
        # Check if number of days is specified
        day_match = re.search(r'(\d+)\s*days', prompt)
        if day_match:
            days = int(day_match.group(1))
        rules["days_inactive"] = days
        explanation_parts.append(f"Targeting inactive customers who have not placed an order in the last {days} days to win them back.")
        
    if "high spend" in prompt or "premium" in prompt or "vip" in prompt or "big spender" in prompt:
        min_spend = 100.0
        spend_match = re.search(r'spend[^\d]*(\d+)', prompt)
        if spend_match:
            min_spend = float(spend_match.group(1))
        rules["min_spend"] = min_spend
        explanation_parts.append(f"Filtering for VIP customers with total spend exceeding ${min_spend:.2f} to reward loyalty.")

    if "loyal" in prompt or "frequent" in prompt:
        rules["min_orders"] = 3
        explanation_parts.append("Targeting frequent shoppers with 3 or more total orders to drive upsell.")

    # Match product category preferences
    category_keywords = ["coffee", "tea", "beans", "fashion", "shoes", "beauty", "electronics"]
    for keyword in category_keywords:
        if keyword in prompt:
            rules["preferred_category"] = keyword.capitalize()
            explanation_parts.append(f"Filtering for shoppers who preferred the category: '{keyword.capitalize()}'.")
            break

    # If no rules found, select all
    if not rules:
        rules = {}
        explanation_parts.append("No specific filter rules detected. Targeting all customers in the database.")

    state["rules"] = rules
    state["explanation"] = " ".join(explanation_parts)
    return state

# 2. Channel Agent Node
def channel_agent(state: AgentState) -> AgentState:
    logger.info("Running Channel Agent...")
    prompt = state["prompt"].lower()
    rules = state.get("rules", {})
    
    # Recommendation logic based on target cohort characteristics
    # E.g. WhatsApp is premium/high engagement, SMS is urgent, Email is long-form/rich.
    if "days_inactive" in rules:
        # Churn winbacks do best on WhatsApp/RCS (high visual open rates)
        channel = "whatsapp"
        explanation = "WhatsApp is recommended for churn recovery because it maintains an 85% open rate compared to 15% for email, making it optimal for re-engaging inactive shoppers."
    elif rules.get("min_spend", 0) >= 100:
        # VIPs get rich RCS/WhatsApp card offers
        channel = "rcs"
        explanation = "RCS selected for VIP cohort. It supports rich card carousels without the premium cost of WhatsApp templates, optimizing LTV margins."
    elif "preferred_category" in rules:
        # Category specific cross-sells do well on Email (visuals matter)
        channel = "email"
        explanation = "Email recommended for category updates to display product photos and detailed catalogues."
    else:
        channel = "sms"
        explanation = "SMS selected for broad reach and high delivery rate."

    state["channel"] = channel
    state["explanation"] += " \n\n" + explanation
    return state

# 3. Content Agent Node
def content_agent(state: AgentState) -> AgentState:
    logger.info("Running Content Agent...")
    channel = state["channel"]
    rules = state.get("rules", {})
    
    # Generate content template depending on rules & channel
    if channel == "whatsapp":
        if "days_inactive" in rules:
            content = "Hey! We miss you. ☕ Use code WE_MISS_YOU for 20% off your next order. Order here: https://xeno.com/shop"
        else:
            content = "Hello! Check out our new arrivals. Exclusive offer: 10% off with code NEW10. Shop now: https://xeno.com/shop"
    elif channel == "rcs":
        content = "Hey VIP! 🌟 Get exclusive early access to our new collection. Free shipping included. Click here: https://xeno.com/vip"
    elif channel == "email":
        cat = rules.get("preferred_category", "premium items")
        content = f"Subject: Handpicked just for you: Special offers on {cat}!\n\nHello from Xeno CRM. We've selected some new additions in our {cat} collection that we think you'll love. Enjoy free shipping on orders over $50."
    else:
        content = "Xeno Alert: Fast sale! 15% off everything today with code FLASH15. Shop now: https://xeno.com/flash"

    state["content"] = content
    return state

# Build the LangGraph Workflow
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("audience", audience_agent)
workflow.add_node("channel", channel_agent)
workflow.add_node("content", content_agent)

# Set up edges
workflow.set_entry_point("audience")
workflow.add_edge("audience", "channel")
workflow.add_edge("channel", "content")
workflow.add_edge("content", END)

# Compile Graph
compiled_graph = workflow.compile()

class AIRecommendationsManager:
    @staticmethod
    def generate_recommendations(user_prompt: str) -> Dict[str, Any]:
        """Runs the LangGraph orchestration to generate segment rules, channel, and message content"""
        initial_state = {
            "prompt": user_prompt,
            "rules": {},
            "channel": "email",
            "content": "",
            "explanation": "",
            "errors": []
        }
        
        try:
            logger.info(f"Running recommendation agents for prompt: {user_prompt}")
            result = compiled_graph.invoke(initial_state)
            return {
                "rules": result["rules"],
                "channel": result["channel"],
                "content": result["content"],
                "explanation": result["explanation"]
            }
        except Exception as e:
            logger.error(f"Error executing agent graph: {e}")
            # Dynamic robust fallback
            return {
                "rules": {},
                "channel": "email",
                "content": "Hi there! We have exciting news just for you. Visit our store to find out more.",
                "explanation": "Fallback default campaign generated due to LangGraph processing error."
            }

agents_service = AIRecommendationsManager()
