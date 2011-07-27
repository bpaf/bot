# Synopsis

This is an IRC bot that I built for my own needs. It's written in JavaScript and it runs on the Node.js platform.

# Installation

Clone the repository

	git clone git://github.com/bpaf/bot.git

Install the dependencies with npm

	cd bot
	npm install

# Usage

## 1. Configuration (REQUIRED)

Edit the configuration JSON file in the `etc/` directory

	cd etc/
	cp config.json mybot.json
	# edit mybot.json

Modules are enabled on all channels unless one sets

	config.<module>.channels = ["#<channel>", …]

Set it to the empty list `[]` to stop inbound message events to a module.

To avoid loading a module altogether, remove the whole `"<module>": { … },` section from `mybot.json`.

## 2. Run

Run with

	bin/bot etc/mybot.json

Cheers.

