#!/usr/bin/env node

/*
 * bashcoin
 * Bitcoin market stats from the command line
 * usage: $ bashcoin [stat]
 * uses Mt.Gox API
 * Dan Motzenbecker
 * MIT License
 */

process.title = 'bashcoin';

var https = require('https'),
    bashcoin = require('commander'),
    req = false,
    ticker = null,
    history = null,
    strikeouts = 0;

bashcoin
    .version('0.1.1')
    .option('-c, --cont', 'run continuously, query every 30 seconds')
    .option('-b, --buy', 'output buy')
    .option('-s, --sell', 'output sell')
    .option('-S, --spread', 'output spread (rounded)')
    .option('-H, --high', 'output high')
    .option('-L, --low', 'output low')
    .option('-a, --avg', 'output average')
    .option('-v, --vol', 'output volume')
    .option('-p, --vwap', 'output volume-weighted average price')
    .option('-l, --last', 'output last')
    .option('-A, --all', 'output all available stats')
    .option('-i, --interval [seconds]', 'custom interval for continuous output')
    .parse(process.argv);

var reqOptions = {
    host : 'data.mtgox.com',
    path : '/api/2/BTCUSD/money/ticker',
    port : 443,
    headers : { 'User-Agent' : 'bashcoin' }
}

var terms = ['buy', 'sell', 'high', 'low', 'avg', 'vol', 'vwap', 'last'];

query();
bashcoin.cont && setInterval(query, bashcoin.interval * 1000 || 30000);

function query(){
    req && req.abort();
    req = https.get(reqOptions, function(res){
            var data = '';
            res.on('data', function(chunk){
                data += chunk;
            });
            res.on('end', function(){
                try{
                    handleStats(JSON.parse(data));
                }catch(e){
                    return outputError(e);
                }
            });
        }
    ).on('error', function(e){
        outputError(e);
    }).end();
}

function getDelta(term){
    if(bashcoin.cont && history !== null){
        var delta = 100 - (history[term].value / ticker[term].value * 100);

        if(delta === 0 || isNaN(delta) || !isFinite(delta)){
            return '';
        }

        delta = delta.toFixed(2);
        if(delta === '0.00'){
            return '';
        }

        if(parseFloat(delta, 10) > 0){
            return ' \x1b[32m+' + delta + '%\x1b[0m';
        }else{
            return ' \x1b[31m' + delta + '%\x1b[0m';
        }

    }else{
        return '';
    }
}

function handleStats(obj){
    ticker = obj.ticker;
    console.log('');
    if(!bashcoin.all &&
        (
            (!bashcoin.cont && process.argv.length < 3) ||
            ( bashcoin.cont && process.argv.length < 4)
        )
    ){
            bashcoin.buy  = true;
            bashcoin.sell = true;
            bashcoin.high = true;
            bashcoin.low  = true;
    }

    for(var i = 0, len = terms.length; i < len; i++){
        var term = terms[i],
            pad  = term.length === 3 ? '    ' : '   ';

        if(bashcoin[term] || bashcoin.all){
            console.log(' ' + term + pad + ticker[term] + getDelta(term));
        }
    }

    if(bashcoin.spread || bashcoin.all){
       ticker.spread = Math.round((ticker.sell - ticker.buy) * 10000) / 10000;
       console.log(' spread ' + ticker.spread + getDelta('spread'));
    }

    history = ticker;
    console.log('');
}

function outputError(e){
    strikeouts++;
    console.error(' \x1b[31msomething went wrong accessing the stats.\x1b[0m\n');
    (!bashcoin.cont || (bashcoin.cont && strikeouts > 4)) && process.exit(1);
}
