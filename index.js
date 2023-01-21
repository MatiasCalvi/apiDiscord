const dotenv = require("dotenv");
dotenv.config();
const { TOKEN, DB_LINK } = process.env;
const axios = require("axios");
const fs = require("node:fs");
const path = require("node:path");
const MongoClient = require("mongodb").MongoClient;
/* const ObjectId = require("mongodb").ObjectId; */

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  PermissionsBitField,
} = require("discord.js");
const { Console } = require("node:console");

/* const { Console } = require("node:console"); */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

/* const clientMongo = new MongoClient(DB_LINK, { useNewUrlParser: true }); */

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

client.on(Events.ClientReady, () => {
  console.log("ready!");
});

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

client.on(Events.GuildMemberAdd, (member) => {
  console.log(`Nuevo miembro: ${member.user.username}`);
  let tag = member.user.tag;
  console.log(`Su identificador es: ${member.user.tag}`);
  console.log(`ID: ${member.id}`);
  const [username, discriminator] = tag.split("#");
  axios
    .get(`http://localhost:8080/api/user/${username}%23${discriminator}`)
    .then((response) => {
      if (response.data.success) {
        let nickName = `${response.data.data.lastName}${" "}${
          response.data.data.name
        }`;
        let role = member.guild.roles.cache.find((r) => r.name === "alumno");
        member.roles.add(role);
        member.setNickname(nickName);
      }
    })
    .catch((e) => {
      if (!e.response.data.success) {
        let role = member.guild.roles.cache.find(
          (r) => r.name === "no verificado"
        );
        member.roles.add(role);
        let channel = member.guild.channels.cache.find(
          (channel) => channel.name === "no-verificados"
        );
        if (channel) {
          channel.send(
            `El usuario ${member.user.username} acaba de entrar al servidor pero no ha sido verificado aun`
          );
        }
      }
    });
});

const prohibitedWords = ["puto", "weon"];

client.on(Events.MessageCreate, (message) => {
  // Verificar si el mensaje contiene una palabra prohibida
  const includesProhibitedWord = prohibitedWords.some((word) =>
    message.content.includes(word)
  );
  /* console.log(message.member) */
  if (includesProhibitedWord) {
    let tag = message.member.user.tag;
    const [username, discriminator] = tag.split("#");
    axios
      .get(`http://localhost:8080/api/user/${username}%23${discriminator}`)
      .then((response) => {
        if (response.data.data.strikes === 0) {
          let data = {};
          data.strikes = 1;
          let reason = `Palabra prohibida utilizada: ${message.content}`;
          axios
            .patch(
              `http://localhost:8080/api/user/${username}%23${discriminator}`,
              data
            )
            .then((response) => {
              message.channel.send(
                "Palabra prohibida utilizada, se le advierte una vez.."
              );
              MongoClient.connect(
                DB_LINK,
                { useUnifiedTopology: true },
                (err, client) => {
                  if (err) throw err;
                  let db = client.db("test");
                  let collection = db.collection("bans");
                  // guardando el baneo en la base de datos
                  collection.insertOne(
                    {
                      userIdDiscord: message.author.id,
                      username: message.member.nickname,
                      discordTag: message.author.tag,
                      reportedBy: message.client.user.tag,
                      reason: reason,
                      date: new Date(),
                    },
                    (err, res) => {
                      if (err) throw err;
                      console.log("Report saved to the database");
                      client.close();
                    }
                  );
                }
              );
			  	// Eliminar el mensaje
    			message.delete();
            })
            .catch((e) => {
              console.log("LINEA 164");
              console.log(e);
            });
        } if (response.data.data.strikes === 1) {
          let data = {};
          data.strikes = 2;
          let reason = `Palabra prohibida utilizada: ${message.content}`;
          axios
            .patch(
              `http://localhost:8080/api/user/${username}%23${discriminator}`,
              data
            )
            .then((response) => {
              message.channel.send(
                "Palabra prohibida utilizada, recuerde que ya se le ha advertido previamente, la proxima vez sera baneado"
              );
              MongoClient.connect(
                DB_LINK,
                { useUnifiedTopology: true },
                (err, client) => {
                  if (err) throw err;
                  let db = client.db("test");
                  let collection = db.collection("bans");
                  // guardando el baneo en la base de datos
                  collection.insertOne(
                    {
                      userIdDiscord: message.author.id,
                      username: message.member.nickname,
                      discordTag: message.author.tag,
                      reportedBy: message.client.user.tag,
                      reason: reason,
                      date: new Date(),
                    },
                    (err, res) => {
                      if (err) throw err;
                      console.log("Report saved to the database");
                      client.close();
                    }
                  );
                }
              );
			  // Eliminar el mensaje
			  message.delete();
            })
            .catch((e) => {
              console.log("LINEA 195");
              console.log(e);
            });
        } if (response.data.data.strikes === 2) {
          let data = {};
          data.strikes = 3;
          axios
            .patch(
              `http://localhost:8080/api/user/${username}%23${discriminator}`,
              data
            )
            .then((response) => {
				let reason = `Palabra prohibida utilizada: ${message.content}`;
				let currentTime = new Date();
				let currentDateString = currentTime.toLocaleDateString();
				// Enviar un mensaje al canal de reportes
				let reportesChannel = message.guild.channels.cache.get("1065801843332108309");
				if(reportesChannel) {
					reportesChannel.send(`El usuario ${message.member.nickname} ha sido baneado por usar una palabra prohibida: ${reason} Fecha: ${currentDateString}  Hora: ${currentTimeString}`);
				}

              MongoClient.connect(
                DB_LINK,
                { useUnifiedTopology: true },
                (err, client) => {
                  if (err) throw err;
                  let db = client.db("test");
                  let collection = db.collection("bans");
                  // guardando el baneo en la base de datos
                  collection.insertOne(
                    {
                      userIdDiscord: message.author.id,
                      username: message.author.username,
                      discordTag: message.author.tag,
                      reportedBy: message.client.user.tag,
                      reason: reason,
                      date: currentTime,
                    },
                    (err, res) => {
                      if (err) throw err;
                      console.log("Ban saved to the database");
                      client.close();
                    }
                  );
                }
              );
			  // Eliminar el mensaje
			  message.delete();

              // Banear al usuario

               message.guild.members.ban(message.author, {reason: reason}); 

            })
            .catch((e) => {
              console.log("LINEA 239");
              console.log(e);
            });
        }
      })
      .catch((e) => {
        console.log("LINEA 247");
        console.log(e);
      });
  }
});

client.login(TOKEN);
