"use strict";

console.log("ŁADOWANIE BIBLIOTEK...");

const fs = require("fs");
const Discord = require("discord.js");
const client = new Discord.Client();

client.login("NjY3NzE1NTc5MzY4NDM5ODE4.XiS_yQ.fFxivCMCG_xKBVEz6S80btHfNww").catch(console.error);

client.on("ready", function() {
	client.user.setActivity(client.guilds.size + " serwer" + (client.guilds.size === 1 ? "" : "s"), { type: "WATCHING" }).catch(console.error);
	console.log("GOTOWY DO AKCJI");
});

let config = {
	replacements: {},
	nicknames: {},
	prefixes: {},
	active: {},
	tags: {},
	pins: {},
	live: {}
};

function updateJson() {
	fs.writeFileSync("config.json", JSON.stringify(config, undefined, "\t"));
}

if (fs.existsSync("config.json")) {
	config = JSON.parse(fs.readFileSync("config.json", "utf8"));
} else {
	updateJson();
}

const enable = { "1": true, "true": true, "yes": true, "confirm": true, "agree": true, "enable": true, "on": true, "positive": true, "accept": true, "ye": true, "yep": true, "ya": true, "yah": true, "yeah": true, "sure": true, "ok": true, "okay": true };
const disable = { "0": true, "false": true, "no": true, "deny": true, "denied": true, "disagree": true, "disable": true, "off": true, "negative": true, "-1": true, "nah": true, "na": true, "nope": true, "stop": true, "end": true, "cease": true };
const whitelist = { text: true, group: true, dm: true };

function updateStatus() {
	const size = Object.keys(config.active).length;
	client.user.setActivity(size + " repostów" + (size === 1 ? "" : "s"), { type: "WATCHING" }).catch(console.error);
}

function capitalizeFirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function inactive(to, from) {
	return from && !config.active[from] || !config.active[to];
}

async function send(channel, content, reactions) {
	const channelID = channel.channelID || channel.id;
	if (inactive(channelID)) return;
	const sent = await channel.send(content).catch(console.error);
	if (reactions.size) {
		for (const reaction of reactions.values()) {
			if (inactive(channelID)) break;
			const emoji = reaction.emoji;
			if (client.emojis.has(emoji.id) || emoji.id === null) {
				await sent.react(emoji).catch(console.error);
			}
		}
	}
}

function richEmbed(embed) {
	const rich = new Discord.RichEmbed();
	if (embed.author) {
		rich.setAuthor(embed.author.name, embed.author.iconURL, embed.author.url);
	}
	rich.setColor(embed.color);
	if (embed.description) {
		rich.setDescription(embed.description);
	}
	for (let i = 0; i < embed.fields.length; i++) {
		const field = embed.fields[i];
		rich.addField(field.name, field.value, field.inline);
	}
	if (embed.footer) {
		rich.setFooter(embed.footer.text, embed.footer.iconURL);
	}
	if (embed.image) {
		rich.setImage(embed.image.url);
	}
	if (embed.thumbnail) {
		rich.setThumbnail(embed.thumbnail.url);
	}
	rich.setTimestamp(embed.timestamp);
	if (embed.title) {
		rich.setTitle(embed.title);
	}
	rich.setURL(embed.url);
	return rich;
}

function setBoolean(channel, key, value) {
	const guild = (channel.guild || channel).id;
	const enabled = config[key][guild];
	const property = capitalizeFirst(key);
	if (enable[value]) {
		config[key][guild] = true;
		channel.send("✅ **" + property + " on!**").catch(console.error);
	} else if (disable[value]) {
		config[key][guild] = false;
		channel.send("❌ **" + property + " off!**").catch(console.error);
	} else {
		config[key][guild] = !enabled;
		channel.send((enabled ? "❌" : "✅") + " **" + property + " toggled " + (enabled ? "off" : "on") + "!**").catch(console.error);
	}
	updateJson();
}

function niceName(to, from, user) {
	const guild = (to.guild || to).id;
	if (config.nicknames[guild] && from.guild) {
		const member = from.guild.member(user);
		if (member) {
			return member.displayName;
		} else if (config.tags[guild]) {
			return user.tag;
		} else {
			user.username;
		}
	} else if (config.tags[guild]) {
		return user.tag;
	} else {
		return user.username;
	}
}

function setPrefix(channel, prefix) {
	const guild = (channel.guild || channel).id;
	const previous = config.prefixes[guild] || "/";
	if (prefix) {
		config.prefixes[guild] = prefix;
		channel.send("**Zmieniono prefiks z  `" + previous + "` do `" + prefix + "`!**").catch(console.error);
		updateJson();
	} else {
		channel.send("**Brakuje argumentu `prefiks`!" + previous + "repost prefix <PREFIX>`**").catch(console.error);
	}
}

function setReplacement(channel, find, replace) {
	const guild = (channel.guild || channel).id;
	const prefix = config.prefixes[guild] || "/";
	config.replacements[guild] = config.replacements[guild] || {};
	if (find && replace) {
		config.replacements[guild][find] = replace;
		channel.send("**Zastąpianie`" + find + "` z `" + replace + "`!**").catch(console.error);
		updateJson();
	} else if (find) {
		const replacement = config.replacements[guild][find];
		if (replacement) {
			channel.send("**`" + find + "` is replaced with `" + replacement + "`**").catch(console.error);
		} else {
			channel.send("**Brakujący argument `replace`! `" + prefix + "repost replace " + find + " <REPLACE>`**").catch(console.error);
		}
	} else {
		channel.send("**Brakuje argumentów `find` i `replace`!! `" + prefix + "repost replace <FIND> <REPLACE>`**").catch(console.error);
	}
}

async function awaitReaction(message, author, emoji, func) {
	await message.react(emoji).catch(console.error);
	const collector = message.createReactionCollector(function(reaction, user) {
		return user.id === author && reaction.emoji.name === emoji;
	}, { max: 1 });
	collector.on("collect", function() {
		collector.stop();
		func();
	});
}

async function sendReplacements(channel, id) {
	const replace = config.replacements[(channel.guild || channel).id];
	if (replace) {
		const size = Object.keys(replace).length;
		const count = await channel.send("**Ten kanał ma " + size + " zastąpień" + (size === 1 ? "" : "") + "!**").catch(console.error);
		for (let find in replace) {
			const message = await channel.send("`" + find + "` jest zastąpione z`" + replace[find] + "`").catch(console.error);
			awaitReaction(message, id, "❌", function() {
				delete replace[find];
				message.delete().catch(console.error);
				updateJson();
				const newSize = Object.keys(replace).length;
				count.edit("**Ten kanał ma " + newSize + " zastąpień" + (newSize === 1 ? "" : "") + "!**").catch(console.error);
			});
		}
	} else {
		channel.send("**Ten kanał nie ma zastąpień**").catch(console.error);
	}
}

function replaceAll(channel, str) {
	const replace = config.replacements[(channel.guild || channel).id];
	if (replace) {
		let replaced = str;
		for (let find in replace) {
			const regex = new RegExp(find, "g");
			replaced = replaced.replace(regex, replace[find]);
		}
		return replaced;
	} else {
		return str;
	}
}

const systemMessages = {
	RECIPIENT_ADD: " dodał kogoś do grupy",
	RECIPIENT_REMOVE: " usunął kogoś z grupy",
	CALL: " rozpoczął rozmowę",
	CHANNEL_NAME_CHANGE: " zmienił nazwę tego kanału",
	CHANNEL_ICON_CHANGE: " zmienił ikonę tego kanału",
	PINS_ADD: " przypiął wiadomość",
	GUILD_MEMBER_JOIN: " dołączył"
};

async function sendMessage(message, channel, webhook, author) {
	if (inactive(channel.id, message.channel.id)) return;
	if (message.type !== "DEFAULT") {
		await channel.send("**" + replaceAll(channel, niceName(channel, message.channel, message.author)) + systemMessages[message.type] + "**").catch(console.error);
	} else if (message.author.id !== author) {
		if (webhook) {
			await webhook.edit(replaceAll(channel, niceName(channel, message.channel, message.author)), message.author.displayAvatarURL).catch(console.error);
		} else {
			await channel.send("**" + replaceAll(channel, niceName(channel, message.channel, message.author)) + "**").catch(console.error);
		}
	}
	if (message.content) {
		await send(webhook ? webhook : channel, replaceAll(channel, message.content), message.reactions);
	}
	if (message.attachments.size) {
		for (const attachment of message.attachments.values()) {
			await send(webhook ? webhook : channel, attachment.filesize > 8000000 ? attachment.url : { files: [attachment.url] }, message.reactions);
		}
	}
	if (message.embeds.length) {
		for (let i = 0; i < message.embeds.length; i++) {
			const embed = message.embeds[i];
			if (embed.type === "rich") {
				await send(webhook ? webhook : channel, richEmbed(embed), message.reactions);
			}
		}
	}
}

async function sendMessages(messages, channel, webhook, author) {
	if (inactive(channel.id)) return;
	let last;
	if (messages && messages.size) {
		const backward = messages.array().reverse();
		for (let i = 0; i < backward.length; i++) {
			if (inactive(channel.id, backward[i].channel.id)) break;
			await sendMessage(backward[i], channel, webhook, last ? last.author.id : author);
			last = backward[i];
		}
	}
}

async function fetchMessages(message, channel, webhook, author) {
	if (inactive(channel.id, message.channel.id)) return;
	const messages = await message.channel.fetchMessages({ limit: 100, after: message.id }).catch(async function() {
		await channel.send("**Nie udało się pobrać wiadomości!**").catch(console.error);
	});
	if (inactive(channel.id, message.channel.id)) return;
	if (messages && messages.size) {
		await sendMessages(messages, channel, webhook, author);
		const last = messages.last();
		await fetchMessages(last, channel, webhook, last.author.id);
	} else {
		await channel.send("**Repost zakończony!**").catch(console.error);
	}
}

async function fetchWebhook(channel) {
	const webhooks = await channel.fetchWebhooks().catch(async function() {
		await channel.send("**Nie mogę przeczytać webhooków!**").catch(console.error);
	});
	if (webhooks) {
		for (const webhook of webhooks.values()) {
			if (webhook.owner.id === client.user.id) {
				return webhook;
			}
		}
		return channel.createWebhook("Reposter", client.user.displayAvatarURL).catch(console.error);
	}
}

async function sendInfo(to, from, hook) {
	const rich = new Discord.RichEmbed();
	rich.setTitle(from.name || from.id);
	rich.setDescription(from.topic || "Brak tematu!");
	rich.setFooter("Repostowanie z " + from.id, client.user.displayAvatarURL);
	if (from.guild) {
		rich.setAuthor(from.guild.name, from.guild.iconURL);
		rich.setThumbnail(from.guild.iconURL);
	} else if (from.recipient) {
		rich.setAuthor(niceName(to, from, from.recipient), from.recipient.displayAvatarURL);
		rich.setThumbnail(from.recipient.displayAvatarURL);
	} else {
		rich.setAuthor(niceName(to, from, from.owner), from.iconURL);
		rich.setThumbnail(from.iconURL);
	}
	rich.setTimestamp();
	if (from.parent) {
		rich.addField("Kategoria kanału: ", from.parent.name, true);
	}
	rich.addField("Kanał NSFW", from.nsfw || "Nie", true);
	rich.addField("ID kanału", from.id, true);
	rich.addField("Typ kanału", from.type, true);
	rich.addField("Data stworzenia kanału", from.createdAt, true);
	rich.addField("Czas stworzenia kanału", from.createdTimestamp, true);
	if (from.guild) {
		rich.addField("ID serwera", from.guild.id, true);
		rich.addField("Właściciel serwera", niceName(to, from, from.guild.owner.user), true);
		rich.addField("Region serwera", from.guild.region, true);
		const channels = new Map();
		for (const channel of from.guild.channels.values()) {
			channels.set(channel.type, (channels.get(channel.type) || 0) + 1);
		}
		for (const channel of channels.entries()) {
			rich.addField(capitalizeFirst(channel[0]) + " Kanały", channel[1], true);
		}
		let bots = 0;
		for (const member of from.guild.members.values()) {
			if (member.user.bot) {
				bots++;
			}
		}
		rich.addField("Osoby na serwerze ", from.guild.members.size - bots, true);
		rich.addField("Boty na serwerze ", bots, true);
		rich.addField("Role na serwerze ", from.guild.roles.size, true);
		rich.addField("Emoji na serwerze ", from.guild.emojis.size, true);
		rich.addField("Weryfikacja na serwerze ", from.guild.verificationLevel, true);
		rich.addField("Domyślna rola ", from.guild.defaultRole.name, true);
		rich.addField("ID domyślnej roli ", from.guild.defaultRole.id, true);
		if (from.guild.systemChannel) {
			rich.addField("Domyślny kanał ", from.guild.systemChannel.name, true);
			rich.addField("ID domyślnego kanału", from.guild.systemChannelID, true);
		}
		rich.addField("Data stworzenia serwera ", from.guild.createdAt, true);
		rich.addField("Czas stworzenia serwera ", from.guild.createdTimestamp, true);
	} else if (from.recipients) {
		rich.addField("Właściciel kanału ", niceName(to, from, from.owner), true);
		rich.addField("Członkowie kanału ", from.recipients.size, true);
	}
	await to.send(rich).catch(console.error);
	if (inactive(to.id, from.id)) return;
	const webhook = hook && await fetchWebhook(to);
	if (config.pins[(to.guild || to).id]) {
		await to.send("__**Przypięte wiadomości**__").catch(console.error);
		const pins = await from.fetchPinnedMessages().catch(async function() {
			await to.send("**Nie mogę wczytać przypiętych wiadomości!**").catch(console.error);
		});
		await sendMessages(pins, to, webhook);
	}
	if (inactive(to.id, from.id)) return;
	await to.send("__**Wiadomości**__").catch(console.error);
	const messages = await from.fetchMessages({ limit: 1, after: "0" }).catch(async function() {
		await to.send("**Nie mogę wczytać wiadomości! Czy oby na pewno ten bot też jest na serwerze, z którego jest robiony repost?**").catch(console.error);
	});
	const first = messages && messages.first();
	if (first) {
		await sendMessage(first, to, webhook);
		await fetchMessages(first, to, webhook, first.author.id);
	} else {
		await to.send("**Repost zrobiony!!**").catch(console.error);
	}
}

async function repost(id, message, webhook, direction, live) {
	const channel = (id && id.id) ? id : client.channels.get(id);
	const dir = direction ? "z" : "do";
	if (!channel) {
		const guild = client.guilds.get(id);
		if (guild) {
			config.active[message.channel.id] = true;
			updateStatus();
			await message.channel.send("**Repostowanie" + (live ? " na żywo " : " ") + dir + " `" + (guild.name || id) + "`!**").catch(console.error);
			for (const match of guild.channels.values()) {
				if (inactive(message.channel.id)) break;
				config.active[match.id] = true;
				updateStatus();
				updateJson();
				await repost(match, message, webhook, direction, live);
			}
		} else if (message.mentions.channels.size) {
			await repost(message.mentions.channels.first(), message, webhook, direction, live);
		} else {
			const matches = [];
			for (const match of client.channels.values()) {
				if (id === match.name) {
					matches.push(match);
				}
			}
			if (matches.length) {
				if (matches.length === 1) {
					await repost(matches[0], message, webhook, direction, live);
				} else {
					await message.channel.send("**Znaleziono " + matches.length + " kanałów!**").catch(console.error);
					for (let i = 0; i < matches.length; i++) {
						const match = matches[i];
						const rich = new Discord.RichEmbed();
						rich.setFooter(capitalizeFirst(match.type) + " Kanał", client.user.displayAvatarURL);
						if (match.guild) {
							rich.setAuthor(match.name, match.guild.iconURL);
						} else if (match.recipient) {
							rich.setAuthor(niceName(message.channel, match, match.recipient), match.recipient.displayAvatarURL);
						} else {
							rich.setAuthor(match.name, match.iconURL);
						}
						rich.setTimestamp(match.createdAt);
						rich.addField("ID kanału", "`" + match.id + "`", false);
						const embed = await message.channel.send(rich).catch(console.error);
						awaitReaction(embed, message.author.id, "✅", async function() {
							await repost(match, message, webhook, direction, live);
						});
					}
				}
			} else {
				await message.channel.send("**Nie można zrepostować " + dir + " `" + id + "`!**").catch(console.error);
			}
		}
	} else if (channel.id === message.channel.id) {
		await message.channel.send("**Nie mogę zrepostować  " + dir + " tych samych kanałów!**").catch(console.error);
	} else if (!whitelist[channel.type]) {
		await message.channel.send("**Nie mogę zrepostować  " + dir + " " + channel.type + " kanałów!**").catch(console.error);
	} else if (webhook && (direction ? message.channel.type : channel.type) === "dm") {
		await message.channel.send("**Nie mogę zrobić webhooków do wiadomości DM!**").catch(console.error);
	} else if (channel.type === "text" && !direction && !channel.permissionsFor(client.user).has("SEND_MESSAGES")) {
		await message.channel.send("**Nie mogę zrepostować do`" + (channel.name || id) + "` bez uprawnień!**").catch(console.error);
	} else {
		const to = direction ? message.channel : channel;
		const from = direction ? channel : message.channel;
		config.active[to.id] = true;
		config.active[from.id] = true;
		updateStatus();
		updateJson();
		await message.channel.send("**Repostowanie " + (live ? " na żywo " : " ") + dir + " `" + (channel.name || id) + "`!**").catch(console.error);
		if (live) {
			config.live[from.id] = { channel: to.id, hook: webhook };
			updateJson();
		} else {
			await sendInfo(to, from, webhook);
		}
	}
}

async function repostLive(message) {
	const live = config.live[message.channel.id];
	if (live) {
		const channel = client.channels.get(live.channel);
		const hook = live.hook && await fetchWebhook(channel);
		sendMessage(message, channel, hook);
	}
}

function sendCommands(channel) {
	const prefix = config.prefixes[(channel.guild || channel).id] || "/";
	const rich = new Discord.RichEmbed();
	rich.setTitle("Komendy repostowania");
	rich.setDescription("By MysteryPancake, przetłumaczone przez NagraniaDVBT 2020. Znalazłeś błąd w tłumaczeniu? Pisz: @NagraniaDVBT 2020#0260");
	rich.setFooter(client.user.id, client.user.displayAvatarURL);
	rich.setAuthor(niceName(channel, channel, client.user), client.user.displayAvatarURL, "https://github.com/MysteryPancake/Discord-Reposter");
	rich.setThumbnail(client.user.displayAvatarURL);
	rich.setTimestamp();
	rich.setURL("https://github.com/MysteryPancake/Discord-Reposter#commands");
	rich.addField("Repost To", "*Repostuj do kanału.*```" + prefix + "repost <CHANNEL>\n" + prefix + "repostuj do <CHANNEL>```", false);
	rich.addField("Repost From", "*Repostuj z kanału.*```" + prefix + "repost from <CHANNEL>```", false);
	rich.addField("Repost Webhook", "*Repostu przez webhooka.*```" + prefix + "reposthook\n" + prefix + "repostwebhook```Instead of:```" + prefix + "repost```", false);
	rich.addField("Repost Live", "*Repostuj wiadomości gdy zostaną wysłane.*```" + prefix + "repostlive\n" + prefix + "repostlivehook```Instead of:```" + prefix + "repost```", false);
	rich.addField("Repost Stop", "*Zatrzymaj repostowanie.*```" + prefix + "repost stop\n" + prefix + "repost halt\n" + prefix + "repost cease\n" + prefix + "repost terminate\n" + prefix + "repost suspend\n" + prefix + "repost cancel\n" + prefix + "repost die\n" + prefix + "repost end```", false);
	rich.addField("Repost Commands", "*Podaj listę komend.*```" + prefix + "repost help\n" + prefix + "repost commands```", false);
	rich.addField("Repost Replace", "*Zamień repost*```" + prefix + "repost replace <FIND> <REPLACE>```", false);
	rich.addField("Repost Replacements", "*Wyślij listę zamian.*```" + prefix + "repost replacements```", false);
	rich.addField("Repost Prefix", "*Zmień prefiks bota.*```" + prefix + "repost prefix <PREFIX>```", false);
	rich.addField("Repost Tags", "*Zmień tagi użytkowników kiedy repostowane.*```" + prefix + "repost tags\n" + prefix + "repost tags <STATE>```", false);
	rich.addField("Repost Nicknames", "*Zmień nazwy użytkowników kiedy repostowane.*```" + prefix + "repost nicknames\n" + prefix + "repost nicknames <STATE>```", false);
	rich.addField("Repost Pins", "*Zmień przypinki kiedy repostowane.*```" + prefix + "repost pins\n" + prefix + "repost pins <STATE>```", false);
	rich.addField("Channel ID", "```" + channel.id + "```", false);
	channel.send(rich).catch(console.error);
}

client.on("message", function(message) {
	repostLive(message);
	if (message.author.bot) return;
	const args = message.content.toLowerCase().split(" ");
	const prefix = config.prefixes[(message.guild || message.channel).id] || "/";
	if (args[0].startsWith(prefix + "repost")) {
		if (!args[1] || args[1] === "help" || args[1] === "commands") {
			sendCommands(message.channel);
		} else if (args[1] === "replacements") {
			sendReplacements(message.channel, message.author.id);
		} else if (args[1] === "replace") {
			setReplacement(message.channel, args[2], args[3]);
		} else if (args[1] === "prefix") {
			setPrefix(message.channel, args[2]);
		} else if (args[1] === "tags" || args[1] === "nicknames" || args[1] === "pins") {
			setBoolean(message.channel, args[1], args[2]);
		} else if (args[1] === "stop" || args[1] === "halt" || args[1] === "cease" || args[1] === "terminate" || args[1] === "suspend" || args[1] === "cancel" || args[1] === "die" || args[1] === "end") {
			delete config.active[message.channel.id];
			delete config.live[message.channel.id];
			updateStatus();
			updateJson();
			message.channel.send("**Repostowanie zakończone!**").catch(console.error);
		} else {
			const last = args[2];
			if (last) {
				repost(last, message, args[0].indexOf("hook") !== -1, args[1] === "from", args[0].indexOf("live") !== -1);
			} else {
				repost(args[1], message, args[0].indexOf("hook") !== -1, false, args[0].indexOf("live") !== -1);
			}
		}
	}
});