"""
AWS Bedrock client wrapper for Claude Sonnet 4.5
Handles API calls, retries, and error handling
"""

import json
import os
from pathlib import Path

import boto3
from botocore.config import Config
import time
import uuid
from typing import Dict, List, Optional
from botocore.exceptions import ClientError, ReadTimeoutError

try:
    from dotenv import load_dotenv
    _proj_root = Path(__file__).resolve().parent.parent.parent
    load_dotenv(_proj_root / ".env")
except ImportError:
    pass

from .logging_utils import get_logger


class BedrockClient:
    """Wrapper for AWS Bedrock API calls"""
    
    def __init__(
        self,
        region: str = "us-east-1",
        read_timeout: int = 600,
        model_id: Optional[str] = None,
        logger=None,
    ):
        """
        Initialize Bedrock client.

        Args:
            region: AWS region for Bedrock
            read_timeout: Read timeout in seconds (default: 600 = 10 minutes)
            model_id: Override model ID. If None, uses env MODEL_ID.
            logger: Optional AgentLogger (uses default if not provided)
        """
        self.logger = logger or get_logger("BedrockClient")
        self.region = region
        default_id = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
        self.model_id = model_id if model_id else os.getenv("MODEL_ID", default_id)
        self.read_timeout = read_timeout
        
        try:
            # Configure client with increased timeouts
            config = Config(
                read_timeout=read_timeout,
                connect_timeout=10,
                retries={'max_attempts': 3, 'mode': 'adaptive'}
            )
            
            self.client = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                config=config
            )
            self.logger.info(f"Bedrock client initialized in region {region} with {read_timeout}s read timeout")
        except Exception as e:
            self.logger.error(
                f"Failed to initialize Bedrock client in region {region}",
                exc_info=e
            )
            raise
    
    def invoke_model(
        self,
        messages: List[Dict],
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: Optional[float] = 0.7,
        top_p: Optional[float] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Invoke Claude Sonnet 4.5 model via Bedrock.
        Use only one of temperature or top_p (model does not allow both).

        Args:
            messages: List of message dictionaries
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            temperature: Temperature parameter (0-1)
            top_p: Top-p parameter (0-1)
            metadata: Optional metadata to log with the call

        Returns:
            Dictionary with response content and metadata
        """
        # Generate unique call ID
        call_id = str(uuid.uuid4())[:8]

        # Start timing
        start_time = time.time()

        try:
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "messages": messages,
                "max_tokens": max_tokens,
            }
            if top_p is not None:
                body["top_p"] = top_p
            elif temperature is not None:
                body["temperature"] = temperature

            if system_prompt:
                body["system"] = system_prompt

            # Log the request start
            prompt_length = sum(len(str(m.get('content', ''))) for m in messages)
            self.logger.log_function_call(
                "invoke_model",
                {
                    "call_id": call_id,
                    "model": self.model_id,
                    "messages_count": len(messages),
                    "prompt_length": prompt_length,
                    "max_tokens": max_tokens
                }
            )

            # Make API call
            response = self.client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body)
            )

            # Calculate elapsed time
            time_elapsed = time.time() - start_time

            # Parse response
            response_body = json.loads(response['body'].read())

            # Extract content
            content = ""
            if response_body.get('content'):
                for block in response_body['content']:
                    if block.get('type') == 'text':
                        content += block.get('text', '')

            # Get token usage
            tokens_used = response_body.get('usage', {})

            # Log successful call with full details
            self.logger.log_bedrock_call(
                call_id=call_id,
                model=self.model_id,
                input_messages=messages,
                system_prompt=system_prompt,
                output=content,
                time_elapsed=time_elapsed,
                tokens_used=tokens_used,
                metadata=metadata
            )

            return {
                'content': content,
                'stop_reason': response_body.get('stop_reason'),
                'usage': tokens_used,
                'model': self.model_id,
                'call_id': call_id,
                'time_elapsed': time_elapsed
            }

        except ClientError as e:
            time_elapsed = time.time() - start_time
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))

            self.logger.log_error_with_context(
                error=e,
                context={
                    'call_id': call_id,
                    'model': self.model_id,
                    'error_code': error_code,
                    'error_message': error_message,
                    'messages_count': len(messages),
                    'time_elapsed': time_elapsed
                }
            )
            raise

        except Exception as e:
            time_elapsed = time.time() - start_time

            self.logger.log_error_with_context(
                error=e,
                context={
                    'call_id': call_id,
                    'model': self.model_id,
                    'messages_count': len(messages),
                    'function': 'invoke_model',
                    'time_elapsed': time_elapsed
                }
            )
            raise
    
    def invoke_with_retry(
        self,
        messages: List[Dict],
        system_prompt: Optional[str] = None,
        max_retries: int = 3,
        **kwargs
    ) -> Dict:
        """
        Invoke model with exponential backoff retry

        Args:
            messages: List of message dicts
            system_prompt: Optional system prompt
            max_retries: Maximum number of retry attempts
            **kwargs: Additional arguments for invoke_model

        Returns:
            Response dictionary

        Raises:
            Exception: If all retries fail
        """
        last_exception = None

        for attempt in range(max_retries):
            try:
                # Add retry metadata
                metadata = kwargs.get('metadata', {})
                metadata['retry_attempt'] = attempt + 1
                kwargs['metadata'] = metadata

                return self.invoke_model(
                    messages=messages,
                    system_prompt=system_prompt,
                    **kwargs
                )
            except ClientError as e:
                last_exception = e
                error_code = e.response.get('Error', {}).get('Code', '')

                # Don't retry on validation errors
                if error_code in ['ValidationException', 'AccessDeniedException']:
                    raise

                # Exponential backoff
                wait_time = 2 ** attempt
                self.logger.warning(
                    f"Bedrock call failed (attempt {attempt + 1}/{max_retries}). "
                    f"Retrying in {wait_time}s. Error: {error_code}"
                )
                time.sleep(wait_time)
            except ReadTimeoutError as e:
                last_exception = e
                self.logger.warning(
                    f"Read timeout on attempt {attempt + 1}/{max_retries}. "
                    f"LLM response took too long (>{self.read_timeout}s). "
                    f"Consider reducing input size or increasing timeout."
                )
                if attempt == max_retries - 1:
                    self.logger.error(
                        "All retry attempts exhausted due to read timeouts. "
                        "The LLM may be receiving too much context or generating very long responses."
                    )
                    raise
                # Shorter backoff for timeouts since they already took a long time
                wait_time = 5
                self.logger.info(f"Retrying in {wait_time}s...")
                time.sleep(wait_time)
            except Exception as e:
                last_exception = e
                self.logger.error(
                    f"Unexpected error on attempt {attempt + 1}/{max_retries}",
                    exc_info=e
                )
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)

        # All retries failed
        self.logger.critical(
            f"All {max_retries} retry attempts failed",
            exc_info=last_exception
        )
        raise last_exception
