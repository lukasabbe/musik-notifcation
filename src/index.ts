import Database from "better-sqlite3"
import { EmbedBuilder, WebhookClient } from "discord.js";
import fetch from "node-fetch";

const db = new Database("database.db")

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
if (!webhookUrl) {
    throw new Error("DISCORD_WEBHOOK_URL is not set. Add it to your .env file.");
}
const webhookClient = new WebhookClient({url: webhookUrl})

db.exec(`
    CREATE TABLE IF NOT EXISTS messages (message TEXT NOT NULL PRIMARY KEY)
    `
)

const insertStmt = db.prepare("INSERT OR IGNORE INTO messages (message) VALUES (?)");
const checkStmt = db.prepare("SELECT 1 FROM messages WHERE message = ?");

function addMessage(message: string) {
  const result = insertStmt.run(message);
  return result.changes > 0; // true if added, false if it already existed
}

function hasMessage(message: string) {
  return checkStmt.get(message) !== undefined;
}

async function getDonations() : Promise<Donation> {
    return (await fetch(`https://musikapi.lukasabbe.com/api/collection/sgc-musikhjaelpen`)).json() as unknown as Donation;
}

type Donation = {
    collectionId: string,
    title: string,
    path: string,
    description: string,
    goal: number,
    externalLink: string,
    createdAt: string,
    image: string,
    amount: number,
    donators: Donator[]
}
type Donator = {
    amount: number,
    name: string,
    paidUtc: string
}

setInterval(
    async () => {
        const data = await getDonations();
        for (const donation of data.donators) {
            if(hasMessage(donation.name)) continue
            const embed = new EmbedBuilder()
                .setColor("#10c935")
                .setTitle(`Tack så mycket till \`${donation.name}\` som har donerat ${donation.amount}! Totalt har vi nu samlat ihop ${data.amount} kr!`)
                .setTimestamp();
            addMessage(donation.name)
            webhookClient.send({embeds: [embed]})
        }
    },
    1000*10
)
