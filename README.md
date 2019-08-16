This project exports scheduled-query-rules from Azure and imports them back using the REST API.

# Usage

```bash
# install required libraries
npm install

# export all action-groups to groups.json and rules to rules.json
node rules export --resource-group my-resource-group

# import all action-groups from groups.json to the specified resource group
node rules import-groups --resource-group my-resource-group

# import all rules from rules.json to the specified resource group
node rules import-rules --resource-group my-resource-group
```
