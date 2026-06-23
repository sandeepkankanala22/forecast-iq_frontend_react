"""
Prompt management utilities
Loads and manages agent prompts from text files
"""

from pathlib import Path
from typing import Dict, Tuple
from .logging_utils import get_logger

# Delimiter separating system prompt from user/task prompt template in a single file
PROMPT_DELIMITER = "--------------------------"


class PromptManager:
    """Manager for loading and caching agent prompts"""
    
    def __init__(self, prompts_dir: str = "prompts", session_manager=None):
        """
        Initialize prompt manager

        Args:
            prompts_dir: Directory containing prompt files
            session_manager: Optional session manager for logging
        """
        self.logger = get_logger("PromptManager", session_manager=session_manager)
        self.prompts_dir = Path(prompts_dir)
        self.prompts_cache: Dict[str, str] = {}
        
        if not self.prompts_dir.exists():
            self.logger.warning(f"Prompts directory {prompts_dir} does not exist")
    
    def load_prompt(self, prompt_name: str, use_cache: bool = True) -> str:
        """
        Load a prompt from file
        
        Args:
            prompt_name: Name of the prompt (without .txt extension)
            use_cache: Whether to use cached version if available
            
        Returns:
            Prompt text
            
        Raises:
            FileNotFoundError: If prompt file doesn't exist
        """
        # Check cache
        if use_cache and prompt_name in self.prompts_cache:
            self.logger.debug(f"Using cached prompt: {prompt_name}")
            return self.prompts_cache[prompt_name]
        
        # Construct file path
        prompt_file = self.prompts_dir / f"{prompt_name}.txt"
        
        try:
            with open(prompt_file, 'r', encoding='utf-8') as f:
                prompt_text = f.read()
            
            # Cache the prompt
            self.prompts_cache[prompt_name] = prompt_text
            
            self.logger.info(f"Loaded prompt: {prompt_name} ({len(prompt_text)} chars)")
            return prompt_text
            
        except FileNotFoundError:
            self.logger.error(f"Prompt file not found: {prompt_file}")
            raise
        except Exception as e:
            self.logger.error(
                f"Failed to load prompt from {prompt_file}",
                exc_info=e
            )
            raise
    
    def get_agent_prompt(self, agent_name: str) -> str:
        """
        Get prompt for a specific agent
        
        Args:
            agent_name: Name of the agent (e.g., 'decomposer', 'critic')
            
        Returns:
            Agent's system prompt
        """
        prompt_name = f"{agent_name}_prompt"
        return self.load_prompt(prompt_name)

    def get_prompt_parts(self, prompt_name: str) -> Tuple[str, str]:
        """
        Load a prompt file and split into system and user/task template by delimiter.
        File format: <system prompt> \\n PROMPT_DELIMITER \\n <user/task template with placeholders>
        
        Args:
            prompt_name: Name of the prompt (without .txt extension)
            
        Returns:
            (system_prompt, user_template) - user_template may contain {placeholders}
        """
        raw = self.load_prompt(prompt_name)
        if PROMPT_DELIMITER not in raw:
            self.logger.warning(f"No delimiter in {prompt_name}; using entire content as system, empty user template")
            return (raw.strip(), "")
        system, _, user = raw.partition(PROMPT_DELIMITER)
        return (system.strip(), user.strip())
    
    def reload_prompt(self, prompt_name: str) -> str:
        """
        Force reload a prompt from file (bypass cache)
        
        Args:
            prompt_name: Name of the prompt
            
        Returns:
            Fresh prompt text
        """
        return self.load_prompt(prompt_name, use_cache=False)
    
    def list_available_prompts(self) -> list:
        """
        List all available prompt files
        
        Returns:
            List of prompt names (without .txt extension)
        """
        try:
            prompt_files = list(self.prompts_dir.glob("*.txt"))
            prompt_names = [f.stem for f in prompt_files]
            
            self.logger.info(f"Found {len(prompt_names)} prompts: {prompt_names}")
            return prompt_names
            
        except Exception as e:
            self.logger.error("Failed to list prompts", exc_info=e)
            return []
    
    def clear_cache(self):
        """Clear the prompt cache"""
        self.prompts_cache.clear()
        self.logger.info("Prompt cache cleared")
