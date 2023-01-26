const dotenv = require("dotenv");
dotenv.config();
const { TOKEN, DB_LINK } = process.env;
const axios = require("axios");
const fs = require("node:fs");
const path = require("node:path");
const MongoClient = require("mongodb").MongoClient;
const clientMongo = new MongoClient(DB_LINK, { useNewUrlParser: true });

/* const ObjectId = require("mongodb").ObjectId; */

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  PermissionsBitField,
} = require("discord.js");

const { prohibitedWords } = require("./words/prohibitedWords");

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

client.on(Events.GuildCreate, async (guild) => {
	
	let configArray;
	try {
        configArray = JSON.parse(fs.readFileSync('config.json'));
    } catch (err) {
        fs.writeFileSync('config.json', '[]');
    	configArray = [];
    }
    const server = { server:guild.name, serverId:guild.id };
    configArray.push(server);
    let configString = JSON.stringify(configArray);
    fs.writeFileSync('config.json', configString);
});

client.on(Events.GuildMemberRemove, async (member) => {
  if (member.user.id === client.user.id) {
  let configArray = require('./config.json');
  configArray = configArray.filter(servidor => servidor.serverId !== member.guild.id);
  let configString = JSON.stringify(configArray);
  fs.writeFileSync('./config.json', configString);
  console.log(`El bot ha sido expulsado del servidor ${member.guild.name} con ID ${member.guild.id} y ha sido eliminado del archivo config.json`);
  }
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
        if (response.data.data.role === "alumno") {
          let role = member.guild.roles.cache.find((r) => r.name === "alumno");
          member.roles.add(role);
        }
        if(response.data.data.role === "mentor"){
          let role = member.guild.roles.cache.find((r) => r.name === "mentor");
          member.roles.add(role);
        }
        member.setNickname(nickName);
      }
    })
    .catch((e) => {

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
        console.log('ERROR LINEA 135')
        console.log(e)
    });
});

client.on(Events.MessageCreate, (message) => {
  // Verificar si el mensaje contiene una palabra prohibida

  const includesProhibitedWord = prohibitedWords.some((word) =>
    message.content.toLowerCase().includes(word.toLowerCase())
  );

  if (includesProhibitedWord) {
    let tag = message.member.user.tag;
    const [username, discriminator] = tag.split("#");
    const nick = message.member.nickname;
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
              clientMongo
                .connect()
                .then(() => {
                  const collection = clientMongo.db("test").collection("bans");
                  collection
                    .insertOne({
                      userIdDiscord: message.author.id,
                      username: message.member.nickname,
                      discordTag: message.author.tag,
                      reportedBy: message.client.user.tag,
                      reason: reason,
                      date: new Date(),
                    })
                    .then((result) => {
                      console.log("Report saved to the database");
                      clientMongo.close();
                    })
                    .catch((err) => {
                      console.log("ERROR LINEA 177");
                      console.log(err);
                      clientMongo.close();
                    });
                })
                .catch((err) => {
                  console.log("ERROR LINEA 182");
                  console.error(err);
                });

              // Eliminar el mensaje
              message.delete();
            })
            .catch((e) => {
              console.log("LINEA 186");
              console.log(e);
            });
        }
        if (response.data.data.strikes === 1) {
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
              clientMongo
                .connect()
                .then(() => {
                  const collection = clientMongo.db("test").collection("bans");
                  collection
                    .insertOne({
                      userIdDiscord: message.author.id,
                      username: message.member.nickname,
                      discordTag: message.author.tag,
                      reportedBy: message.client.user.tag,
                      reason: reason,
                      date: new Date(),
                    })
                    .then((result) => {
                      console.log("Report saved to the database");
                      clientMongo.close();
                    })
                    .catch((err) => {
                      console.log("ERROR LINEA 223");
                      console.log(err);
                      clientMongo.close();
                    });
                })
                .catch((err) => {
                  console.log("ERROR LINEA 228");
                  console.error(err);
                });

              // Eliminar el mensaje
              message.delete();
            })
            .catch((e) => {
              console.log("LINEA 233");
              console.log(e);
            });
        }
        if (response.data.data.strikes === 2) {
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
              // Enviar un mensaje al canal de reportes
              let reportesChannel = message.guild.channels.cache.get(
                "1065801843332108309"
              );
              if (reportesChannel) {
                let currentTime = new Date();
                let currentDateString = currentTime.toLocaleString();
                reportesChannel.send(
                  `El usuario ${message.member.nickname} ha sido baneado, Fecha y hora: ${currentDateString}.`
                );
              }

              clientMongo
                .connect()
                .then(() => {
                  const collection = clientMongo.db("test").collection("bans");
                  collection
                    .insertOne({
                      userIdDiscord: message.author.id,
                      username: nick,
                      discordTag: message.author.tag,
                      reportedBy: message.client.user.tag,
                      reason: reason,
                      date: currentTime,
                    })
                    .then((result) => {
                      console.log("Report saved to the database");
                      clientMongo.close();
                    })
                    .catch((err) => {
                      console.log(err);
                      console.log("ERROR LINEA 280");
                      clientMongo.close();
                    });
                })
                .catch((err) => {
                  console.log("ERROR LINEA 284");
                  console.error(err);
                });

              // Eliminar el mensaje
              message.delete();

              // Banear al usuario

              message.guild.members.ban(message.author, { reason: reason });
            })
            .catch((e) => {
              console.log("ERROR LINEA 293");
              console.log(e);
            });
        }
      })
      .catch((e) => {
        console.log("ERROR LINEA 299");
        console.log(e);
      });
  }
});

client.login(TOKEN);
