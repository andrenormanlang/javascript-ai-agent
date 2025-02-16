import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { z } from "zod";
import "dotenv/config";

const client = new MongoClient(process.env.MONGODB_ATLAS_URI as string);

const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.7,
});

// Schema for frontend principles
const FrontendPrincipleSchema = z.object({
  principle_id: z.string(),
  name: z.string(),
  description: z.string(),
  keyConcepts: z.array(z.string()),
  designGuidelines: z.array(z.string()),
  commonPitfalls: z.array(z.string()),
  bestPractices: z.array(z.string()),
  relevantTechnologies: z.array(z.string()),
  notes: z.string(),
});

type FrontendPrinciple = z.infer<typeof FrontendPrincipleSchema>;

const parser = StructuredOutputParser.fromZodSchema(z.array(FrontendPrincipleSchema));

async function generateSyntheticData(): Promise<FrontendPrinciple[]> {
  const prompt = `You are a helpful assistant that generates data about frontend design principles. Generate 10 fictional records of frontend principles. Each record should include the following fields: principle_id, name, description, keyConcepts, designGuidelines, commonPitfalls, bestPractices, relevantTechnologies, and notes. Ensure variety in the data and realistic values.

${parser.getFormatInstructions()}`;

  console.log("Generating synthetic frontend principles data...");

  const response = await llm.invoke(prompt);
  return parser.parse(response.content as string);
}

async function createFrontendPrincipleSummary(principle: FrontendPrinciple): Promise<string> {
  return new Promise((resolve) => {
    const basics = `${principle.name} (${principle.principle_id}): ${principle.description}`;
    const concepts = `Key Concepts: ${principle.keyConcepts.join(", ")}`;
    const guidelines = `Design Guidelines: ${principle.designGuidelines.join(", ")}`;
    const pitfalls = `Common Pitfalls: ${principle.commonPitfalls.join(", ")}`;
    const practices = `Best Practices: ${principle.bestPractices.join(", ")}`;
    const technologies = `Technologies: ${principle.relevantTechnologies.join(", ")}`;
    const summary = `${basics}. ${concepts}. ${guidelines}. ${pitfalls}. ${practices}. ${technologies}. Notes: ${principle.notes}`;
    resolve(summary);
  });
}

async function seedDatabase(): Promise<void> {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const db = client.db("frontend_db");
    const collection = db.collection("principles");

    await collection.deleteMany({});
    
    const syntheticData = await generateSyntheticData();

    const recordsWithSummaries = await Promise.all(
      syntheticData.map(async (record) => ({
        pageContent: await createFrontendPrincipleSummary(record),
        metadata: { ...record },
      }))
    );
    
    for (const record of recordsWithSummaries) {
      await MongoDBAtlasVectorSearch.fromDocuments(
        [record],
        new OpenAIEmbeddings(),
        {
          collection,
          indexName: "vector_index",
          textKey: "embedding_text",
          embeddingKey: "embedding",
        }
      );

      console.log("Successfully processed & saved record:", record.metadata.principle_id);
    }

    console.log("Database seeding completed");

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await client.close();
  }
}

seedDatabase().catch(console.error);
