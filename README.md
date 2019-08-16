This project exports scheduled-query-rules from Azure and imports them back using the REST API.

# Usage

```bash
# install required libraries
npm install

# export all rules to rules.json from the specified resource group
node rules export --resource-group my-resource-group

# import all rules from rules.json to the specified resource group
node rules import --resource-group my-resource-group

# export all rules to a specified filename from the specified resource group
node rules export --resource-group my-resource-group --filename output.json

# import all rules from a specified filename to the specified resource group
node rules import --resource-group my-resource-group --filename output.json
```
