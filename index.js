const dotenv = require("dotenv");
dotenv.config();
const fs = require("node:fs");
const path = require("node:path");
const axios = require("axios");
const { TOKEN, DB_LINK, guildId } = process.env;
const MongoClient = require("mongodb").MongoClient;

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  PermissionsBitField,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const clientMongo = new MongoClient(DB_LINK, { useNewUrlParser: true });

/* clientMongo.connect(err => {
  const collection = clientMongo.db("test").collection("users");
  
  collection.find({ discordTag: { $exists: true } }).toArray((err, docs) => {
	if (err) throw err;
	  
	for (let i = 0; i < docs.length; i++) {
		let tag = docs[i].discordTag;
		console.log(tag,"Aqui")
		const [username, discriminator] = tag.split('#');
		console.log(tag)
	}
  });
  clientMongo.close()
}); */

client.on(Events.ClientReady, (e) => {
  console.log("ready!");
});

client.on("guildMemberAdd", (member) => {

    console.log(`Nuevo miembro: ${member.user.username}`);
	let tag=member.user.tag
    console.log(`Su identificador es: ${member.user.tag}`);
    console.log(`ID: ${member.id}`);
	const [username, discriminator] = tag.split('#');
	 axios.get(`http://localhost:8080/api/user/${username}%23${discriminator}`)
			.then(response => {
				if(response.data.success){
					let role = member.guild.roles.cache.find(r => r.name === "alumno"); 
					member.roles.add(role);
				}
			})
			.catch(e=> {
				if(!e.response.data.success){
					let role = member.guild.roles.cache.find(r => r.name === "no verificado"); 
					member.roles.add(role);
				} 
				
			}); 
});

client.login(TOKEN);

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});
