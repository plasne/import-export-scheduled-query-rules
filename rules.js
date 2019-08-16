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

async function getObjects(session, resourceGroup, type, version) {
    const s = new spinner(`getting scheduled-query-rules... %s`);
    s.start();
    try {
        const response = await axios.get(
            `https://management.azure.com/subscriptions/${
                session.subscription
            }/resourcegroups/${resourceGroup}/providers/microsoft.insights/${type}?api-version=${version}`,
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

async function putObjects(
    session,
    resourceGroup,
    type,
    version,
    name,
    content
) {
    const s = new spinner(`importing ${name}... %s`);
    s.start();
    try {
        const response = await axios.put(
            `https://management.azure.com/subscriptions/${
                session.subscription
            }/resourcegroups/${resourceGroup}/providers/microsoft.insights/${type}/${name}?api-version=${version}`,
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
    .command(
        'export',
        'Exports all scheduled-query-rules in the resource-group',
        {
            'strip-id': {
                alias: 'x',
                type: 'bool'
            }
        },
        async argv => {
            var session = await getAccessToken();
            var groups = await getObjects(
                session,
                argv.resourceGroup,
                'actionGroups',
                '2017-04-01'
            );
            if (argv.stripId) {
                for (const group of groups) {
                    delete group.id;
                }
            }
            try {
                fs.writeFileSync(
                    './groups.json',
                    JSON.stringify(groups, null, 4)
                );
                console.log(
                    `${groups.length} groups exported from ${
                        argv.resourceGroup
                    } to groups.json.`
                );
            } catch (e) {
                console.error(e);
            }
            var rules = await getObjects(
                session,
                argv.resourceGroup,
                'scheduledQueryRules',
                '2018-04-16'
            );
            if (argv.stripId) {
                for (const rule of rules) {
                    delete rule.id;
                }
            }
            try {
                fs.writeFileSync(
                    './rules.json',
                    JSON.stringify(rules, null, 4)
                );
                console.log(
                    `${rules.length} rules exported from ${
                        argv.resourceGroup
                    } to rules.json.`
                );
            } catch (e) {
                console.error(e);
            }
        }
    )
    .command(
        'import-groups',
        'Imports all action-groups from the groups.json file',
        {},
        async argv => {
            var session = await getAccessToken();
            var contents = fs.readFileSync('./groups.json');
            var groups = JSON.parse(contents);
            for (const group of groups) {
                const name = group.name;
                delete group.id;
                delete group.name;
                delete group.type;
                await putObjects(
                    session,
                    argv.resourceGroup,
                    'actionGroups',
                    '2017-04-01',
                    name,
                    group
                );
            }
            console.log(
                `${groups.length} groups imported from groups.json to ${
                    argv.resourceGroup
                }.`
            );
        }
    )
    .command(
        'import-rules',
        'Imports all scheduled-query-rules from the rules.json file',
        {},
        async argv => {
            var session = await getAccessToken();
            var contents = fs.readFileSync('./rules.json');
            var rules = JSON.parse(contents);
            for (const rule of rules) {
                const name = rule.name;
                delete rule.id;
                delete rule.name;
                delete rule.type;
                await putObjects(
                    session,
                    argv.resourceGroup,
                    'scheduledQueryRules',
                    '2018-04-16',
                    name,
                    rule
                );
            }
            console.log(
                `${rules.length} rules imported from rules.json to ${
                    argv.resourceGroup
                }.`
            );
        }
    )
    .demandCommand(1)
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'v')
    .strict().argv;
