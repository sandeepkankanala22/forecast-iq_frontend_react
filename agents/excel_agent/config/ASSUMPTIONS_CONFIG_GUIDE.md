# Assumptions Configuration Guide

## Overview

The `assumptions.json` file contains all default values used by the `AssumptionsAgent` when extracting forecast configurations from user prompts. By editing this file, you can customize the agent's behavior without modifying code.

## File Location

**Path:** `config/assumptions.json`

## Why Use This Configuration File?

1. **Easy Customization**: Change defaults without touching code
2. **Team Consistency**: Share the same defaults across your organization
3. **Version Control**: Track changes to your assumptions over time
4. **Dynamic Updates**: Reload config without restarting your application
5. **Therapeutic Area Specific**: Customize defaults for different disease areas

## Configuration Structure

### 1. General Defaults

```json
"general_defaults": {
  "forecast_period": 10,
  "granularity": "yearly"
}
```

**What to customize:**
- `forecast_period`: Default number of periods (change to 5 for shorter forecasts)
- `granularity`: "yearly" or "monthly" (your standard time unit)

**Example customization:**
If your team typically does 5-year monthly forecasts:
```json
"general_defaults": {
  "forecast_period": 5,
  "granularity": "monthly"
}
```

---

### 2. Population Defaults

```json
"population_defaults": {
  "base_population": {
    "value": 1000000,
    "source": "assumed"
  },
  "population_growth_rate": 0.02,
  "epidemiology": {
    "metric_type": "incidence",
    "value": 0.05,
    "growth_rate": 0.01
  },
  "patient_funnel": {
    "diagnosis_rate": {"value": 0.7, "growth_rate": 0.02},
    "eligibility_rate": {"value": 0.8, "growth_rate": 0.02},
    "treatment_rate": {"value": 0.6, "growth_rate": 0.02}
  }
}
```

**What to customize:**
- `base_population`: Your typical target population size
- `population_growth_rate`: Annual growth (0.02 = 2%)
- `epidemiology.metric_type`: "incidence" or "prevalence"
- `epidemiology.value`: Default rate (0.05 = 5%)
- Patient funnel rates: Adjust based on your therapeutic area norms

**Example customization for oncology:**
```json
"population_defaults": {
  "base_population": {"value": 5000000, "source": "assumed"},
  "population_growth_rate": 0.015,
  "epidemiology": {
    "metric_type": "incidence",
    "value": 0.01,
    "growth_rate": 0.005
  },
  "patient_funnel": {
    "diagnosis_rate": {"value": 0.85, "growth_rate": 0.03},
    "eligibility_rate": {"value": 0.70, "growth_rate": 0.01},
    "treatment_rate": {"value": 0.75, "growth_rate": 0.02}
  }
}
```

---

### 3. Market Defaults

```json
"market_defaults": {
  "class_share": {
    "lower_limit": 0.05,
    "upper_limit": 0.3,
    "trend_curve": "s_curve",
    "curve_steepness": "medium"
  },
  "product_share_within_class": {
    "lower_limit": 0.02,
    "upper_limit": 0.25,
    "trend_curve": "s_curve",
    "curve_steepness": "steep"
  }
}
```

**What to customize:**
- `lower_limit`: Starting market share (0.05 = 5%)
- `upper_limit`: Peak market share (0.3 = 30%)
- `trend_curve`: Growth pattern ("linear", "s_curve", "exponential", "logarithmic")
- `curve_steepness`: For s_curve: "slow", "medium", or "steep"

**Example customization for competitive market:**
```json
"market_defaults": {
  "class_share": {
    "lower_limit": 0.02,
    "upper_limit": 0.20,
    "trend_curve": "s_curve",
    "curve_steepness": "slow"
  },
  "product_share_within_class": {
    "lower_limit": 0.01,
    "upper_limit": 0.15,
    "trend_curve": "s_curve",
    "curve_steepness": "medium"
  }
}
```

---

### 4. Revenue Defaults

```json
"revenue_defaults": {
  "compliance_rate": 0.85,
  "avg_dosage_per_patient": 12,
  "pricing": {
    "gross_price": 10000,
    "discount_percentage": 0.15,
    "net_price": 8500
  }
}
```

**What to customize:**
- `compliance_rate`: Patient adherence (0.85 = 85%)
- `avg_dosage_per_patient`: Typical annual doses (12 = monthly dosing)
- `gross_price`: List price in your currency
- `discount_percentage`: Standard discount rate (0.15 = 15%)
- `net_price`: Must equal `gross_price * (1 - discount_percentage)`

**Example customization for daily therapy:**
```json
"revenue_defaults": {
  "compliance_rate": 0.90,
  "avg_dosage_per_patient": 365,
  "pricing": {
    "gross_price": 50,
    "discount_percentage": 0.10,
    "net_price": 45
  }
}
```

---

### 5. Disease-Specific Defaults

```json
"disease_specific_defaults": {
  "rare_disease": {
    "population": {
      "base_population_default": 100000
    },
    "epidemiology": {
      "incidence_default": 0.001
    },
    "pricing": {
      "gross_price_default": 150000
    }
  },
  "oncology": { ... },
  "chronic_common": { ... },
  "acute_common": { ... }
}
```

**What to customize:**
- Add new disease categories for your therapeutic areas
- Adjust ranges and defaults based on your market data
- Use these for context-aware extraction when keywords are detected

**Example: Adding a new category for immunology:**
```json
"immunology": {
  "population": {
    "base_population_range": [5000000, 20000000],
    "base_population_default": 10000000
  },
  "epidemiology": {
    "prevalence_range": [0.02, 0.08],
    "prevalence_default": 0.04,
    "metric_type": "prevalence"
  },
  "pricing": {
    "gross_price_range": [30000, 80000],
    "gross_price_default": 50000
  },
  "patient_funnel": {
    "compliance_rate": 0.88
  }
}
```

---

### 6. Market Position Defaults

```json
"market_position_defaults": {
  "first_in_class": {
    "class_share": {
      "lower_limit": 0.10,
      "upper_limit": 0.6,
      "trend_curve": "s_curve",
      "curve_steepness": "medium"
    },
    "product_share_within_class": {
      "lower_limit": 0.40,
      "upper_limit": 0.80,
      "trend_curve": "s_curve",
      "curve_steepness": "medium"
    }
  },
  "best_in_class": { ... },
  "me_too": { ... }
}
```

**What to customize:**
- Adjust expectations based on your historical launches
- Add new categories like "biosimilar", "second_generation", etc.
- Refine share expectations based on your competitive intelligence

**Example: Adding biosimilar positioning:**
```json
"biosimilar": {
  "class_share": {
    "lower_limit": 0.02,
    "upper_limit": 0.15,
    "trend_curve": "linear",
    "curve_steepness": "medium"
  },
  "product_share_within_class": {
    "lower_limit": 0.10,
    "upper_limit": 0.35,
    "trend_curve": "s_curve",
    "curve_steepness": "steep"
  }
}
```

---

### 7. Growth Scenario Modifiers

```json
"growth_scenario_modifiers": {
  "improving_diagnosis": {
    "diagnosis_rate_growth": 0.05
  },
  "expanding_access": {
    "treatment_rate_growth": 0.03,
    "eligibility_rate_growth": 0.02
  },
  "aging_population": {
    "population_growth_rate": 0.025
  }
}
```

**What to customize:**
- Add scenarios relevant to your market (e.g., "new_indication", "price_reduction")
- Adjust growth rates based on historical data
- These trigger when keywords appear in user prompts

**Example: Adding new scenarios:**
```json
"generic_entry": {
  "class_share_upper_limit_penalty": -0.10,
  "pricing_discount_increase": 0.05
},
"label_expansion": {
  "eligibility_rate_growth": 0.08,
  "class_share_upper_limit_boost": 0.15
},
"guideline_update": {
  "treatment_rate_growth": 0.10,
  "diagnosis_rate_growth": 0.05
}
```

---

### 8. Granularity Adjustments

```json
"granularity_adjustments": {
  "monthly": {
    "population_growth_rate_multiplier": 0.0833,
    "avg_dosage_per_patient_divisor": 12
  },
  "yearly": {
    "population_growth_rate_multiplier": 1.0,
    "avg_dosage_per_patient_divisor": 1
  }
}
```

**What to customize:**
- Usually don't need to change these
- Only modify if you have special quarterly or other time periods

---

### 9. Validation Rules

```json
"validation_rules": {
  "rates": {"min": 0.0, "max": 1.0},
  "forecast_period": {"min": 1, "max": 50},
  "population_growth_rate": {"min": 0.0, "max": 0.1}
}
```

**What to customize:**
- Adjust maximum forecast period for your business needs
- Change rate limits if you have edge cases
- Add new validation rules for custom parameters

---

## How to Use Custom Configuration

### 1. Create Your Custom Config

```python
from agents.specialized_agents import AssumptionsAgent
from utils.bedrock_client import BedrockClient
from utils.prompt_manager import PromptManager

# Use default config/assumptions.json
agent = AssumptionsAgent(
    bedrock_client=BedrockClient(),
    prompt_manager=PromptManager(),
    assumptions_config_path="config/assumptions.json"
)

# OR use a custom path
agent = AssumptionsAgent(
    bedrock_client=BedrockClient(),
    prompt_manager=PromptManager(),
    assumptions_config_path="config/my_custom_assumptions.json"
)
```

### 2. View Current Defaults

```python
# Get all defaults
defaults = agent.get_default_assumptions()
print(json.dumps(defaults, indent=2))

# Get disease-specific defaults
oncology = agent.get_disease_specific_defaults("oncology")
print(json.dumps(oncology, indent=2))

# Get market position defaults
first_in_class = agent.get_market_position_defaults("first_in_class")
print(json.dumps(first_in_class, indent=2))
```

### 3. Modify and Reload

```python
# 1. Edit config/assumptions.json in your text editor
# 2. Save changes
# 3. Reload in your application

agent.reload_assumptions_config()

# Now extractions will use the new defaults
config = agent.extract_forecast_config(user_prompt)
```

## Common Customization Scenarios

### Scenario 1: Company-Wide Standards

Your organization always uses specific assumptions:

```json
{
  "general_defaults": {
    "forecast_period": 15,
    "granularity": "yearly"
  },
  "revenue_defaults": {
    "compliance_rate": 0.88,
    "discount_percentage": 0.18
  }
}
```

### Scenario 2: Regional Differences

Create separate configs for different markets:

- `config/assumptions_us.json`
- `config/assumptions_eu.json`
- `config/assumptions_asia.json`

```python
# Load region-specific config
us_agent = AssumptionsAgent(
    bedrock_client=bedrock,
    prompt_manager=pm,
    assumptions_config_path="config/assumptions_us.json"
)
```

### Scenario 3: Therapeutic Area Teams

Each team maintains their own defaults:

- `config/assumptions_oncology.json`
- `config/assumptions_immunology.json`
- `config/assumptions_neurology.json`

### Scenario 4: Pessimistic vs Optimistic

Create scenario-based configs:

- `config/assumptions_base_case.json`
- `config/assumptions_best_case.json`
- `config/assumptions_worst_case.json`

```python
# Run multiple scenarios
scenarios = ["base_case", "best_case", "worst_case"]
results = {}

for scenario in scenarios:
    agent = AssumptionsAgent(
        bedrock_client=bedrock,
        prompt_manager=pm,
        assumptions_config_path=f"config/assumptions_{scenario}.json"
    )
    results[scenario] = agent.extract_forecast_config(prompt)
```

## Best Practices

### 1. Version Control
Keep `assumptions.json` in your git repository to track changes over time.

### 2. Documentation
Add comments (using `"_comment"` keys) to explain why certain values were chosen:
```json
"_comment": "Compliance rate increased to 0.90 based on 2024 Q3 market research showing improved adherence with new delivery device"
```

### 3. Regular Reviews
Review and update defaults quarterly based on:
- New market data
- Competitive intelligence
- Launch performance
- Regulatory changes

### 4. Backup Original
Before making major changes, save a copy:
```bash
cp config/assumptions.json config/assumptions_backup_2024_02_13.json
```

### 5. Validation
After editing, run a test extraction to ensure valid JSON:
```python
agent = AssumptionsAgent(bedrock, pm)
test_config = agent.extract_forecast_config("Test prompt for validation")
print(f"Config loaded successfully: {test_config['metadata']['confidence_level']}")
```

## Troubleshooting

### Config File Not Found
If the agent can't find your config file, it falls back to hardcoded defaults:
```
WARNING: Assumptions config not found at config/assumptions.json, using hardcoded defaults
```
**Solution:** Check the file path or create the missing file.

### Invalid JSON
If your JSON has syntax errors:
```
ERROR: Failed to load assumptions config: Expecting ',' delimiter: line 45 column 5
```
**Solution:** Use a JSON validator or IDE with JSON support to fix syntax.

### Validation Errors
If extracted values fail validation:
```python
config = agent.extract_forecast_config(prompt)
if "validation_errors" in config["metadata"]:
    print("Validation issues:", config["metadata"]["validation_errors"])
```
**Solution:** Adjust your defaults to pass validation rules.

## Example: Complete Customization

Here's a full example customized for a European oncology team:

```json
{
  "_comment": "EU Oncology Team - Updated Q1 2024",
  "_version": "2.0",

  "general_defaults": {
    "forecast_period": 12,
    "granularity": "yearly"
  },

  "population_defaults": {
    "base_population": {
      "value": 450000000,
      "source": "assumed"
    },
    "population_growth_rate": 0.005,
    "epidemiology": {
      "metric_type": "incidence",
      "value": 0.008,
      "growth_rate": 0.003
    },
    "patient_funnel": {
      "diagnosis_rate": {"value": 0.85, "growth_rate": 0.04},
      "eligibility_rate": {"value": 0.65, "growth_rate": 0.01},
      "treatment_rate": {"value": 0.75, "growth_rate": 0.03}
    }
  },

  "market_defaults": {
    "class_share": {
      "lower_limit": 0.03,
      "upper_limit": 0.25,
      "trend_curve": "s_curve",
      "curve_steepness": "medium"
    },
    "product_share_within_class": {
      "lower_limit": 0.05,
      "upper_limit": 0.30,
      "trend_curve": "s_curve",
      "curve_steepness": "steep"
    }
  },

  "revenue_defaults": {
    "compliance_rate": 0.92,
    "avg_dosage_per_patient": 18,
    "pricing": {
      "gross_price": 125000,
      "discount_percentage": 0.22,
      "net_price": 97500
    }
  }
}
```

## Summary

The `assumptions.json` file gives you complete control over the AssumptionsAgent's default behavior. Use it to:

- ✅ Customize for your therapeutic area
- ✅ Maintain consistency across your team
- ✅ Track assumption changes over time
- ✅ Create scenario-based analyses
- ✅ Update without code changes

Remember: The AI will still extract explicit values from prompts - these defaults only fill in missing information!
