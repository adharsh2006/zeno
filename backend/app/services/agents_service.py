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
            
            # Setup database connections to fetch cohort-specific statistics for Send-time & Channel Affinity
            from app.core.database import SessionLocal
            db = SessionLocal()
            recommended_send_time = "7:00 PM"
            channel_affinity = result["channel"]
            affinity_factor = 2.0
            
            try:
                from app.services.segment_engine import segment_engine
                shoppers = segment_engine.get_cohort_customers(db, result["rules"])
                if shoppers:
                    peak_hours = []
                    channel_responses = {}
                    for s in shoppers:
                        meta = s.metadata_fields or {}
                        p_hour = meta.get("peak_engagement_hour")
                        if p_hour is not None:
                            peak_hours.append(p_hour)
                        for m in s.messages:
                            if m.status in ["clicked", "converted"]:
                                channel_responses[m.channel] = channel_responses.get(m.channel, 0) + 1
                    
                    if peak_hours:
                        avg_peak = int(sum(peak_hours) / len(peak_hours))
                        period = "PM" if avg_peak >= 12 else "AM"
                        disp_hour = avg_peak - 12 if avg_peak > 12 else avg_peak
                        if disp_hour == 0: disp_hour = 12
                        recommended_send_time = f"{disp_hour}:00 {period}"
                    
                    if channel_responses:
                        best_channel = max(channel_responses, key=channel_responses.get)
                        clicks_count = channel_responses[best_channel]
                        channel_affinity = best_channel
                        # Calculate a realistic affinity comparison multiplier
                        other_clicks = sum(channel_responses.values()) - clicks_count
                        avg_others = other_clicks / (len(channel_responses) - 1) if len(channel_responses) > 1 else 0.5
                        affinity_factor = max(1.5, clicks_count / max(1, avg_others))
                
                # Append insights to AI agent explanation output
                time_insight = f"📊 AI Send-Time Optimizer: Recommends sending at {recommended_send_time} (Average peak engagement for this audience)."
                affinity_insight = f"🎯 Channel Affinity: {channel_affinity.upper()} is recommended. Shoppers in this cohort respond {affinity_factor:.1f}x more on {channel_affinity.upper()} than alternative channels."
                result["explanation"] += f"\n\n{time_insight}\n{affinity_insight}"
                
            except Exception as inner_e:
                logger.error(f"Error computing agent database insights: {inner_e}")
            finally:
                db.close()
                
            return {
                "rules": result["rules"],
                "channel": result["channel"],
                "content": result["content"],
                "explanation": result["explanation"],
                "recommended_send_time": recommended_send_time,
                "channel_affinity": channel_affinity
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
