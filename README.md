# Synopsis

This is an IRC bot that I built for my own needs.

# Installation

Clone the repository

	git clone git://github.com/bpaf/bot.git

Install the dependencies with npm

	cd bot
	npm install

# Usage

Edit the configuration json file in the etc/ directory

	cd etc/
        cp config.json mybot.json
	# edit mybot.json

Modules are enabled on all channels unless one sets

	config.<module>.channels = ["#<channel>", …]

To disable a module just set it to the empty list.

Run with

	bin/bot etc/mybot.json

Cheers.

