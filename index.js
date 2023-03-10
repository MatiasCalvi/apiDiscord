const dotenv = require("dotenv");
dotenv.config();
const { TOKEN, DB_LINK } = process.env;
const axios = require("axios");
const fs = require("node:fs");
const path = require("node:path");
const MongoClient = require("mongodb").MongoClient;
const clientMongo = new MongoClient(DB_LINK, { useNewUrlParser: true });

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  PermissionsBitField,
} = require("discord.js");

const { prohibitedWords } = require("./words/prohibitedWords");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on(Events.ClientReady, () => {
  console.log("ready!");
});

// EVENTO CUANDO EL BOT ES INVITADO A UN NUEVO SERVIDOR

let channelIDs = [];

client.on(Events.GuildCreate, async (guild) => {
  let adminRole = guild.roles.cache.find((role) => role.name === "admin");
  let mentorRole = guild.roles.cache.find((role) => role.name === "mentor");
  let egresado = guild.roles.cache.find((role) => role.name === "egresado");
  let noAlumnoRole = guild.roles.cache.find(
    (role) => role.name === "no-verificado"
  );
  let alumnoRole = guild.roles.cache.find((role) => role.name === "alumno");

  if (adminRole === undefined) {
    await guild.roles
      .create({
        name: "admin",
        color: "#33FF3F",
        permissions: [PermissionsBitField.Flags.Administrator],
      })
      .catch(console.error);
  }

  if (mentorRole === undefined) {
    await guild.roles
      .create({
        name: "mentor",
        color: "#FF9F33",
        permissions: [PermissionsBitField.Flags.Administrator],
      })
      .catch(console.error);
  }

  if (egresado === undefined) {
    await guild.roles
      .create({ name: "egresado", color: "#FF5833" })
      .catch(console.error);
  }

  if (alumnoRole === undefined) {
    await guild.roles
      .create({ name: "alumno", color: "#FFF333" })
      .catch(console.error);
  }

  if (noAlumnoRole === undefined) {
    await guild.roles
      .create({ name: "no-verificado", color: "#FF1111" })
      .catch(console.error);
  }

  let category = guild.channels.cache.find(
    (channel) => channel.name === "CANALES-DE-CONTROL" && channel.type === 4
  );

  if (category === undefined) {
    let channel = await guild.channels.create({
      name: "CANALES-DE-CONTROL",
      type: 4,
    });
    let categoryId = channel.id;
    await channel.guild.channels
      .create({
        name: "no-verificados",
        type: 0,
        parent: categoryId,
        position: 1,
      })
      .catch(console.error);
    await channel.guild.channels
      .create({ name: "reportes", type: 0, parent: categoryId, position: 2 })
      .catch(console.error);
    await channel.guild.channels
      .create({ name: "implementacion-de-comandos", type: 0, parent: categoryId, position: 3 })
      .catch(console.error);
  }

  const channels = guild.channels.cache;

  channels.forEach((channel) => {
    if (channel.createdTimestamp > Date.now() - 5000) {
      channelIDs.push(channel.id);
    }
  });

  console.log("canales creados: ", channelIDs);

  let configArray;
  try {
    configArray = JSON.parse(fs.readFileSync("config.json"));
  } catch (err) {
    fs.writeFileSync("config.json", "[]");
    configArray = [];
  }
  const server = { server: guild.name, serverId: guild.id };
  configArray.push(server);
  let configString = JSON.stringify(configArray);
  fs.writeFileSync("config.json", configString);
});

// EVENTO CUANDO SE ELIMINA EL BOT DEL SERVIDOR

client.on(Events.GuildDelete, async (guild) => {
  let configArray = require("./config.json");
  configArray = configArray.filter(
    (servidor) => servidor.serverId !== guild.id
  );
  let configString = JSON.stringify(configArray);
  fs.writeFileSync("./config.json", configString);
  console.log(
    `El bot ha sido expulsado del servidor ${guild.name} con ID ${guild.id} y ha sido eliminado del archivo config.json`
  );
});

// EVENTO CUANDO SE DESCONECTA EL SERVIDOR

client.on("guildUnavailable", (guild) => {
  console.log("LINEA 143");
  console.log(guild);
});

// CREAR NUEVA COLECCION DE COMANDOS

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

// EVENTO CUANDO SE EJECUTA UN COMANDO

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

// EVENTO CUANDO ENTRA UN USUARIO AL SERVIDOR

client.on(Events.GuildMemberAdd, (member) => {
  console.log(`Nuevo miembro: ${member.user.username}`);
  let tag = member.user.tag;
  console.log(`Su identificador es: ${member.user.tag}`);
  console.log(`ID: ${member.id}`);
  const [username, discriminator] = tag.split("#");
  axios
    .get(`http://localhost:8000/api/user/${username}%23${discriminator}`)
    .then((response) => {
      if (response.data.success) {
        let nickName = `${response.data.data.lastName}${" "}${
          response.data.data.name
        }`;
        if (response.data.data.role === "alumno") {
          let role = member.guild.roles.cache.find((r) => r.name === "alumno");
          member.roles.add(role);
        }
        if (response.data.data.role === "mentor") {
          let role = member.guild.roles.cache.find((r) => r.name === "mentor");
          member.roles.add(role);
        }
        member.setNickname(nickName);
      }
    })
    .catch((e) => {
      let role = member.guild.roles.cache.find(
        (r) => r.name === "no-verificado"
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
      console.log("ERROR LINEA 231");
      console.log(e.response.data.message);
    });
});

// EVENTO CUANDO ENTRA UN USUARIO DICE UNA PALABRA PROHIBIDA

client.on(Events.MessageCreate, (message) => {
  const includesProhibitedWord = prohibitedWords.some((word) =>
    message.content.toLowerCase().includes(word.toLowerCase())
  );

  if (includesProhibitedWord) {
    let tag = message.member.user.tag;
    const [username, discriminator] = tag.split("#");
    /* const nick = message.member.nickname; */
    axios
      .get(`http://localhost:8000/api/user/${username}%23${discriminator}`)
      .then((response) => {
        if (response.data.data.strikes === 0) {
          let data = {};
          let currentTime = new Date();
          data.strikes = 1;
          let reason = `Palabra prohibida utilizada: ${message.content}`;
          axios
            .patch(
              `http://localhost:8000/api/user/${username}%23${discriminator}`,
              data
            )
            .then((response) => {
              message.channel.send(
                "Palabra prohibida utilizada, se le advierte una vez.."
              );
              clientMongo
                .connect()
                .then(() => {
                  const collection = clientMongo.db("test").collection("users");
                  collection
                    .findOneAndUpdate(
                      { discordTag: message.author.tag },
                      {
                        $push: {
                          reports: {
                            reportedBy: message.client.user.tag,
                            reason: reason,
                            date: currentTime,
                          },
                        },
                      }
                    )
                    .then((result) => {
                      console.log("Report saved to the database");
                      clientMongo.close();
                    })
                    .catch((err) => {
                      console.log(err);
                      console.log("ERROR LINEA 287");
                      clientMongo.close();
                    });
                })
                .catch((err) => {
                  console.log("ERROR LINEA 292");
                  console.error(err);
                });

              message.delete();
            })
            .catch((e) => {
              console.log("LINEA 299");
              console.log(e);
            });
        }
        if (response.data.data.strikes === 1) {
          let data = {};
          data.strikes = 2;
          let currentTime = new Date();
          let reason = `Palabra prohibida utilizada: ${message.content}`;
          axios
            .patch(
              `http://localhost:8000/api/user/${username}%23${discriminator}`,
              data
            )
            .then((response) => {
              message.channel.send(
                "Palabra prohibida utilizada, recuerde que ya se le ha advertido previamente, la proxima vez sera baneado"
              );
              clientMongo
                .connect()
                .then(() => {
                  const collection = clientMongo.db("test").collection("users");
                  collection
                    .findOneAndUpdate(
                      { discordTag: message.author.tag },
                      {
                        $push: {
                          reports: {
                            reportedBy: message.client.user.tag,
                            reason: reason,
                            date: currentTime,
                          },
                        },
                      }
                    )
                    .then((result) => {
                      console.log("Report saved to the database");
                      clientMongo.close();
                    })
                    .catch((err) => {
                      console.log(err);
                      console.log("ERROR LINEA 340");
                      clientMongo.close();
                    });
                })
                .catch((err) => {
                  console.log("ERROR LINEA 345");
                  console.error(err);
                });

              message.delete();
            })
            .catch((e) => {
              console.log("LINEA 352");
              console.log(e);
            });
        }
        if (response.data.data.strikes === 2) {
          let data = {};
          data.strikes = 3;
          axios
            .patch(
              `http://localhost:8000/api/user/${username}%23${discriminator}`,
              data
            )
            .then((response) => {
              let reason = `Palabra prohibida utilizada: ${message.content}`;
              let currentTime = new Date();

              let reportesChannel1 = message.guild.channels.cache.find(
                (channel) => channel.name === "reportes" && channel.type === 0
              );
              let reportesChannelID = reportesChannel1.id;
              let reportesChannel =
                message.guild.channels.cache.get(reportesChannelID);
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
                  const collection = clientMongo.db("test").collection("users");
                  collection
                    .findOneAndUpdate(
                      { discordTag: message.author.tag },
                      {
                        $push: {
                          reports: {
                            reportedBy: message.client.user.tag,
                            reason: reason,
                            date: currentTime,
                          },
                        },
                      }
                    )
                    .then((result) => {
                      console.log("Report saved to the database");
                      clientMongo.close();
                    })
                    .catch((err) => {
                      console.log(err);
                      console.log("ERROR LINEA 404");
                      clientMongo.close();
                    });
                })
                .catch((err) => {
                  console.log("ERROR LINEA 409");
                  console.error(err);
                });

              message.delete();

              message.guild.members.ban(message.author, { reason: reason });
            })
            .catch((e) => {
              console.log("ERROR LINEA 418");
              console.log(e);
            });
        }
      })
      .catch((e) => {
        console.log("ERROR LINEA 424");
        console.log(e);
      });
  }
});

client.login(TOKEN);
