"""
Base agent class for Excel Agent Playground
Provides common functionality for all agents using Bedrock
"""

from typing import List, Dict, Optional
from ..utils.bedrock_client import BedrockClient
from ..utils.prompt_manager import PromptManager
from ..utils.logging_utils import get_logger


class BaseAgent:
    """Base class for all agents in the system"""
    
    def __init__(
        self,
        name: str,
        prompt_name: str,
        bedrock_client: BedrockClient,
        prompt_manager: PromptManager,
        temperature: float = 0.7,
        session_manager=None,
    ):
        """
        Initialize base agent

        Args:
            name: Agent name for identification
            prompt_name: Name of prompt file (without .txt)
            bedrock_client: Bedrock client for API calls
            prompt_manager: Prompt manager for loading prompts
            temperature: Sampling temperature for model
            session_manager: Optional session manager for logging
        """
        self.name = name
        self.prompt_name = prompt_name
        self.bedrock = bedrock_client
        self.prompt_manager = prompt_manager
        self.temperature = temperature
        self.logger = get_logger(f"Agent.{name}", session_manager=session_manager)
        
        # System prompt is supplied per-call from combined prompt files (system + task in one file)
        self.system_prompt = ""
        self.logger.info(f"Initialized {name} agent")
        
        # Conversation history
        self.conversation_history: List[Dict] = []
    
    def generate_response(
        self,
        user_message: str,
        context: Optional[Dict] = None,
        max_tokens: int = 16000,
        system_prompt_override: Optional[str] = None
    ) -> str:
        """
        Generate response to user message
        
        Args:
            user_message: User's input message
            context: Optional context information
            max_tokens: Maximum tokens in response
            system_prompt_override: If set, used as system prompt for this call (from combined prompt file)
            
        Returns:
            Agent's response text
        """
        try:
            # Build message with context if provided
            if context:
                context_str = "\n\nContext:\n" + "\n".join(
                    f"- {k}: {v}" for k, v in context.items()
                )
                full_message = user_message + context_str
            else:
                full_message = user_message
            
            # Add to conversation history
            self.conversation_history.append({
                'role': 'user',
                'content': full_message
            })
            
            self.logger.info(f"Generating response to: {user_message[:100]}...")
            
            system_prompt = system_prompt_override if system_prompt_override is not None else self.system_prompt
            # Call Bedrock API with metadata
            response = self.bedrock.invoke_with_retry(
                messages=self.conversation_history,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
                temperature=self.temperature,
                metadata={
                    'agent': self.name,
                    'prompt_name': self.prompt_name,
                    'has_context': context is not None
                }
            )
            
            response_text = response['content']
            
            # Add response to history
            self.conversation_history.append({
                'role': 'assistant',
                'content': response_text
            })
            
            self.logger.info(f"Generated response ({len(response_text)} chars)")
            self.logger.debug(f"Response: {response_text[:200]}...")
            
            return response_text
            
        except Exception as e:
            self.logger.log_error_with_context(
                error=e,
                context={
                    'agent': self.name,
                    'user_message': user_message[:200],
                    'has_context': context is not None
                }
            )
            raise
    
    def ask_clarification(self, questions: List[str]) -> str:
        """
        Ask clarifying questions to the user
        
        Args:
            questions: List of questions to ask
            
        Returns:
            Formatted question message
        """
        question_text = "I need some clarification:\n\n"
        question_text += "\n".join(f"{i+1}. {q}" for i, q in enumerate(questions))
        
        self.logger.info(f"Asking {len(questions)} clarification questions")
        return question_text
    
    def reset_conversation(self):
        """Clear conversation history"""
        self.conversation_history.clear()
        self.logger.info(f"Reset conversation history for {self.name}")
    
    def get_conversation_summary(self) -> Dict:
        """
        Get summary of conversation
        
        Returns:
            Dictionary with conversation statistics
        """
        return {
            'agent': self.name,
            'message_count': len(self.conversation_history),
            'user_messages': sum(
                1 for msg in self.conversation_history if msg['role'] == 'user'
            ),
            'assistant_messages': sum(
                1 for msg in self.conversation_history if msg['role'] == 'assistant'
            )
        }
