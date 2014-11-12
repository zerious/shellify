#!/usr/bin/env node

var dir = __dirname;

// When called directly, run the shellify CLI.
if (process.mainModule.filename == __filename) {
  setImmediate(function () {
    module.parent = module;
    shellify({
      root: dir + '/',
      commands: {
        init: {
          note: 'Initializes Shellify boilerplate code in the current working directory',
          options: {}
        }
      }
    });
  });
}

/**
 * Create and return a new CLI.
 */
var shellify = module.exports = function (config) {

  console.log();
  process.on('exit', function () {
    console.log();
  });

  // Remove the extension so that it will match the process args.
  var caller = module.parent.filename.replace(/\..*$/, '');

  // By default, assume the CLI is rooted from where shellify was called,
  // and make sure it ends with a slash.
  config.root = (config.root || caller.replace(/[\/\\][^\/\\]*$/, ''))
                  .replace(/([^\/\\])$/, '$1/');

  config.stdin = config.stdin || process.stdin;
  config.stdout = config.stdout || process.stdout;

  try {
    config.package = require(config.root + 'package.json');
  }
  catch (e) {
    console.log(('No package.json in "' + config.root + '".').red);
  }

  if (!config.commands) {
    console.log('Shellify config should have a commands object.'.red);
  }

  var name = config.package.name;
  config.commands = JSON.parse('{"help":' + JSON.stringify({
    note: 'Learn about a command with ' + name.green + ' help '.cyan + '<command>'
  }) + ',' + JSON.stringify(config.commands).substr(1));

  var args = process.argv;
  var arg = args.shift();
  if (/\bnode$/.test(arg)) {
    args.shift();
  }
  var commandName = args.shift();
  var command = config.commands[commandName];

  if (command) {
    command.name = commandName;
    runCommand(command);
  }
  else {
    if (commandName) {
      console.log(('Unknown command: "' + commandName + '"\n').red);
    }
    showHelp();
  }

  /**
   * Create a map of options and values by iterating over arguments.
   */
  function addOptionInputs(command, optionObjects) {
    var input = {}; // Named arguments.
    var array = []; // Unnamed arguments.
    var currentKey;
    args.forEach(function (arg) {
      if (arg[0] == '-') {
        currentKey = arg;
        input[currentKey] = true;
      }
      else {
        if (currentKey) {
          input[currentKey] = arg;
        }
        else {
          array.push(arg);
        }
        input[currentKey] = arg;
        currentKey = null;
      }
    });
    for (var key in input) {
      var value = input[key];
      if (key[0] == '-' && key[1] != '-') {
        delete input[key];
        // TODO: Deal with the '-' arg.
        for (var i = 1; i < key.length; i++) {
          input['-' + key[i]] = value;
        }
      }
    }
    command.input = {$: array};
    optionObjects.forEach(function (options) {
      for (var key in options) {
        var short = key[0];
        var defaultValue = options[key].split('|')[1];
        key = key.replace(/_(.)/, function (match, letter) {
          short = letter;
        });
        var long = hyphenate(key);
        command.input[key] = input['-' + short] || input['--' + long] || defaultValue;
      }
    });
  }

  function hyphenate(string) {
    return string.replace(/([a-z])([A-Z])/g, function (match, lo, hi) {
      return lo + '-' + hi.toLowerCase();
    });
  }

  function getRequiredInputs(command, optionObjects, callback) {
    var ok = true;
    optionObjects.forEach(function (options) {
      for (var key in options) {
        var prompt = options[key];
      }
    });
    if (ok) {
      callback();
    }
  }

  function runCommand(command) {
    var optionObjects = [command.options, config.options || {}];
    addOptionInputs(command, optionObjects);
    getRequiredInputs(command, optionObjects, function () {

      // TODO: Remove input.input in 1.0.0
      var input = command.input;
      input.input = input.input || input;
      var fn;
      try {
        fn = require(config.root + 'commands/' + commandName);
      }
      catch (e) {
        fn = showHelp;
      }
      fn(input, command, commandName);
    });
  }

  function pad(str, width) {
    var len = Math.max(2, width - str.length);
    return str + Array(len + 1).join(' ');
  }

  function showHelp(input, command, commandName) {
    var commands = config.commands;
    var out = '';

    var width = 0;

    function calculateKeyWidth(map) {
      if (map) {
        for (var key in map) {
          width = Math.max(width, key.replace(/_/g, '').length + 4);
        }
      }
    }

    var helpName;
    var helpCommand;
    if (commandName == 'help') {
      helpName = input.$[0];
      helpCommand = commands[helpName];
    }
    if (helpCommand) {
      var options = helpCommand.options;
      calculateKeyWidth(options);
      out += 'Command Usage:\n  ' + name.green + ' ' + helpName.cyan + (width ? ' <options>\n'.yellow : '') + '\n';
      if (width) {
        out += 'Options:';
        for (var key in options) {
          var option = options[key];
          var short = key[0];
          key = key.replace(/_(.)/, function (match, letter) {
            short = letter;
          });
          var arg = '-' + short + ', --' + hyphenate(key);
          out += '\n  ' + pad(arg, width + 2).yellow + option.gray;
        }
      }
    }
    else {
      out += 'Usage:\n  ' + name.green + ' <command> '.cyan + '<options>\n\n' + 'Commands:';

      calculateKeyWidth(commands);

      for (var key in commands) {
        var command = commands[key];
        var alias = command.alias;
        var keys = key + (alias ? ', ' + alias : '');
        out += '\n  ' + pad(keys, width + 2).cyan + commands[key].note.gray;
      }
    }
    console.log(out);
  }

};

/**
 * Expose terminal colors.
 */
shellify.colors = require(dir + '/common/string/colors.js');

/**
 * Expose a recursive mkdir.
 */
shellify.mkdirp = require(dir + '/common/fs/mkdirp');

/**
 * Expose the Shellify version via package.json lazy loading.
 */
Object.defineProperty(shellify, 'version', {
  get: function () {
    return require(__dirname + '/package.json').version;
  }
});
