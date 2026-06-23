# Excel Agent Playground

A conversational AI system for creating Excel spreadsheets using AutoGen and AWS Bedrock (Claude Sonnet 4.5).

## Overview

This system uses multiple specialized AI agents that collaborate to create professional Excel spreadsheets. The agents communicate naturally with users, ask clarifying questions, and work together to produce high-quality outputs.

## Features

- **Conversational Interface**: Natural language interaction for Excel creation
- **Multi-Agent Architecture**: Specialized agents for different aspects of spreadsheet creation
- **Intelligent Workflow**: Automatic task decomposition and coordination
- **Quality Assurance**: Built-in review and critique system
- **Comprehensive Logging**: Detailed logs for debugging and tracking
- **Error Handling**: Robust error handling with contextual information
- **AWS Bedrock Integration**: Uses Claude Sonnet 4.5 via Bedrock

## Architecture

### Agents

1. **Coordinator Agent**: Orchestrates the entire process, manages workflow
2. **Decomposer Agent**: Breaks down complex requests into actionable tasks
3. **Data Agent**: Structures and populates data tables
4. **Math Agent**: Creates and tracks formulas, handles multi-reference chains
5. **Styling Agent**: Applies professional formatting and styling
6. **Critic Agent**: Reviews spreadsheets for quality and errors

### Components

- **BedrockClient**: Handles AWS Bedrock API calls with retry logic
- **ExcelManager**: Manages Excel file operations
- **PromptManager**: Loads and caches agent prompts from files
- **AgentLogger**: Provides comprehensive logging with color coding

## Installation

### Prerequisites

- Python 3.8+
- AWS account with Bedrock access
- AWS credentials configured (`~/.aws/credentials` or environment variables)

### Setup

1. Clone or download the repository:
```bash
cd excel_agent_playground
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure AWS credentials:
```bash
# Option 1: AWS CLI
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_DEFAULT_REGION=us-east-1
```

## Usage

### Interactive CLI

Start the interactive command-line interface:

```bash
python main.py
```

### Example Interactions

```
You: Create a monthly budget spreadsheet with categories for income and expenses

Agent: I need some clarification:

1. How many months do you want to track (e.g., 12 months, current year)?
2. What expense categories do you want (e.g., Housing, Food, Transportation)?
3. What income sources should be included?
4. Do you need any specific calculations (e.g., savings rate, variance)?

Your answers: 12 months, categories are Rent, Food, Transport, Entertainment, 
income from Salary and Freelance, yes include savings rate

Agent: [Creates workflow and coordinates agents to build spreadsheet]
```

### Commands

- **Describe what you want**: Natural language request for spreadsheet creation
- **`review <filepath>`**: Review an existing Excel file
- **`status`**: Show status of all agents
- **`reset`**: Reset all agents and clear conversation history
- **`help`**: Show help message
- **`quit` or `exit`**: Exit the program

## Project Structure

```
excel_agent_playground/
├── agents/
│   ├── __init__.py
│   ├── base_agent.py          # Base agent class
│   └── specialized_agents.py   # All specialized agent implementations
├── prompts/
│   ├── coordinator_prompt.txt
│   ├── decomposer_prompt.txt
│   ├── critic_prompt.txt
│   ├── styling_prompt.txt
│   ├── math_prompt.txt
│   └── data_prompt.txt
├── utils/
│   ├── __init__.py
│   ├── bedrock_client.py      # AWS Bedrock client wrapper
│   ├── excel_utils.py          # Excel file operations
│   ├── logging_utils.py        # Logging utilities
│   └── prompt_manager.py       # Prompt loading and caching
├── logs/                       # Log files (created automatically)
├── output/                     # Output Excel files (created automatically)
├── orchestrator.py             # Main orchestrator
├── main.py                     # CLI entry point
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

## Prompt Management

All agent prompts are stored in separate text files in the `prompts/` directory. This makes them easy to:

- **Edit**: Modify agent behavior by editing prompt files
- **Version Control**: Track changes to prompts
- **A/B Test**: Try different prompt variations
- **Maintain**: Keep prompts organized and readable

To modify an agent's behavior, simply edit its prompt file and restart the system.

## Logging

The system provides comprehensive logging:

- **Console**: Color-coded INFO level messages
- **Files**: Detailed DEBUG level logs in `logs/` directory
- **Error Tracking**: Full stack traces with context

Each agent and component has its own logger, making it easy to track issues to their source.

### Log Format

Console:
```
2024-02-12 10:30:45 | Orchestrator        | INFO     | Processing request
```

File:
```
2024-02-12 10:30:45 | Orchestrator | INFO | orchestrator.py:123 | Processing request
```

## Error Handling

All errors are:
1. Caught and logged with full context
2. Include stack traces for debugging
3. Provide user-friendly messages
4. Track the source module and function

Example error log:
```python
ERROR | Agent.Math | math_prompt.py:45 | Failed to design formulas
Context: {'user_request': '...', 'requirements': {...}}
Traceback: ...
```

## Configuration

### AWS Region

Change the AWS region in `orchestrator.py`:
```python
self.bedrock = BedrockClient(region="us-west-2")  # Default: us-east-1
```

### Model Parameters

Adjust temperature for each agent in `specialized_agents.py`:
```python
super().__init__(
    ...
    temperature=0.7  # Range: 0.0 (deterministic) to 1.0 (creative)
)
```

### Output Directory

Change output location in `main.py`:
```python
self.orchestrator = ExcelAgentOrchestrator(
    output_dir="my_output_folder"
)
```

## Extending the System

### Adding a New Agent

1. Create a new class in `agents/specialized_agents.py`:
```python
class MyCustomAgent(BaseAgent):
    def __init__(self, bedrock_client, prompt_manager):
        super().__init__(
            name="MyCustom",
            prompt_name="mycustom",
            bedrock_client=bedrock_client,
            prompt_manager=prompt_manager
        )
    
    def my_custom_method(self, params):
        # Your logic here
        pass
```

2. Create prompt file `prompts/mycustom_prompt.txt`

3. Initialize in orchestrator:
```python
agents['mycustom'] = MyCustomAgent(
    bedrock_client=self.bedrock,
    prompt_manager=self.prompt_manager
)
```

### Adding New Features

The system is designed to be extensible:
- Add new methods to `ExcelManager` for Excel operations
- Add new utility functions to `utils/`
- Extend agent capabilities in `specialized_agents.py`
- Add new workflow logic in `orchestrator.py`

## Troubleshooting

### AWS Credentials Error
```
Error: Unable to locate credentials
```
**Solution**: Configure AWS credentials using `aws configure` or environment variables

### Module Import Error
```
ModuleNotFoundError: No module named 'X'
```
**Solution**: Install dependencies with `pip install -r requirements.txt`

### Bedrock Access Error
```
AccessDeniedException
```
**Solution**: Ensure your AWS account has access to Bedrock and Claude models

### Prompt File Not Found
```
FileNotFoundError: prompts/X_prompt.txt
```
**Solution**: Ensure all prompt files are present in the `prompts/` directory

## Best Practices

1. **Start Simple**: Begin with simple requests to understand the system
2. **Be Specific**: Provide clear requirements to reduce clarification rounds
3. **Review Logs**: Check log files when debugging issues
4. **Iterate**: Use the Critic agent's feedback to improve outputs
5. **Customize Prompts**: Tailor agent prompts to your specific needs

## Performance Tips

- The system makes multiple API calls, so complex requests may take time
- Agent conversation history is maintained - reset when starting a new task
- Use specific requests rather than vague descriptions for faster results
- Review the workflow plan before full execution for complex requests

## Future Enhancements

Potential improvements:
- [ ] Add actual Excel file generation (currently demonstrates workflow)
- [ ] Implement formula recalculation using LibreOffice
- [ ] Add support for charts and pivot tables
- [ ] Integrate with cloud storage (S3, Google Drive)
- [ ] Add web interface
- [ ] Support for templates
- [ ] Batch processing capabilities

## Contributing

To contribute:
1. Add new agents or improve existing ones
2. Enhance error handling
3. Improve prompt quality
4. Add new Excel features
5. Improve documentation

## License

This project is for educational and demonstration purposes.

## Support

For issues or questions:
1. Check the logs in `logs/` directory
2. Review the error messages and context
3. Verify AWS credentials and Bedrock access
4. Ensure all dependencies are installed

## Acknowledgments

- Built with AutoGen framework
- Uses AWS Bedrock and Claude Sonnet 4.5
- Inspired by multi-agent collaboration patterns
