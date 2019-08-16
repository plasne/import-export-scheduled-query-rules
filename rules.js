const yargs = require('yargs');
const axios = require('axios');
const spinner = require('cli-spinner').Spinner;
const child_process = require('child_process');
const fs = require('fs');

// run a command
function run(command) {
    return new Promise((resolve, reject) => {
        child_process.exec(command, (err, stdout, stderr) => {
            if (!err) {
                resolve(stdout);
            } else {
                reject(err, stderr);
            }
        });
    });
}

async function getAccessToken() {
    const s = new spinner(`authenticating... %s`);
    s.start();
    try {
        const raw = await run('az account get-access-token');
        const response = JSON.parse(raw);
        s.stop(true);
        return response;
    } catch (ex) {
        s.stop(true);
        console.error(ex);
        console.log(
            '\nMake sure you have install the Azure CLI 2.0 tool and have logged in!\n'
        );
        process.exit(1);
    }
}

async function getScheduledQueryRules(session, resourceGroup) {
    const s = new spinner(`getting scheduled-query-rules... %s`);
    s.start();
    try {
        const response = await axios.get(
            `https://management.azure.com/subscriptions/${
                session.subscription
            }/resourcegroups/${resourceGroup}/providers/microsoft.insights/scheduledQueryRules?api-version=2018-04-16`,
            {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`
                }
            }
        );
        s.stop(true);
        if (
            !response.data ||
            !response.data.value ||
            response.data.value.length < 1
        ) {
            console.log('there were no alerts found in this resource-group.');
            return [];
        } else {
            return response.data.value;
        }
    } catch (e) {
        s.stop(true);
        if (e.response) {
            console.error(`${e.response.status}: ${e.response.statusText}`);
        } else {
            console.error(e);
        }
        process.exit(1);
    }
}

async function putScheduledQueryRule(session, resourceGroup, name, content) {
    const s = new spinner(`importing ${name}... %s`);
    s.start();
    try {
        const response = await axios.put(
            `https://management.azure.com/subscriptions/${
                session.subscription
            }/resourcegroups/${resourceGroup}/providers/microsoft.insights/scheduledQueryRules/${name}?api-version=2018-04-16`,
            content,
            {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`
                }
            }
        );
        s.stop(true);
        console.log(
            `on importing "${name}"... ${response.status}: ${
                response.statusText
            }`
        );
    } catch (e) {
        s.stop(true);
        if (e.response) {
            console.error(
                `on importing "${name}"... ${e.response.status}: ${
                    e.response.statusText
                }`
            );
        } else {
            console.error(e);
        }
        process.exit(1);
    }
}

// process the command line arguments
yargs
    .option('resource-group', {
        alias: 'r',
        type: 'string',
        demandOption: true
    })
    .option('filename', {
        alias: 'f',
        type: 'string',
        default: 'rules.json'
    })
    .command(
        'export',
        'Exports all scheduled-query-rules in the resource-group',
        {},
        async argv => {
            var session = await getAccessToken();
            var rules = await getScheduledQueryRules(
                session,
                argv.resourceGroup
            );
            try {
                fs.writeFileSync(argv.filename, JSON.stringify(rules, null, 4));
                console.log(
                    `${rules.length} rules exported to ${argv.filename}.`
                );
            } catch (e) {
                console.error(e);
            }
        }
    )
    .command(
        'import',
        'Imports all scheduled-query-rules from the specified filename',
        {},
        async argv => {
            var session = await getAccessToken();
            var contents = fs.readFileSync(argv.filename);
            var rules = JSON.parse(contents);
            for (const rule of rules) {
                const name = rule.name;
                delete rule.id;
                delete rule.name;
                delete rule.type;
                await putScheduledQueryRule(
                    session,
                    argv.resourceGroup,
                    name,
                    rule
                );
            }
            console.log(`${rules.length} rules imported to ${argv.filename}.`);
        }
    )
    .demandCommand(1)
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'v')
    .strict().argv;
