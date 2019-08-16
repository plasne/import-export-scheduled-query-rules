This project exports scheduled-query-rules from Azure and imports them back using the REST API.

# Usage

```bash
# install required libraries
npm install

# to login using az
az login
az account set --subscription my_subscription_id

# export all action-groups to groups.json and rules to rules.json
node rules export --resource-group my-resource-group

# import all action-groups from groups.json to the specified resource group
node rules import-groups --resource-group my-resource-group

# import all rules from rules.json to the specified resource group
node rules import-rules --resource-group my-resource-group
```
