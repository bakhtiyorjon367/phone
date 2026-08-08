import os

from beanie import init_beanie
from dotenv import load_dotenv
from pymongo import AsyncMongoClient

from models.batch import Batch
from models.budget import Budget
from models.phone import Phone
from models.user import User

load_dotenv()


async def init_db():
    # Fetch URI from environment, default to local MongoDB
    mongo_uri = os.getenv("MONGO_URI")
    client = AsyncMongoClient(mongo_uri)

    # Initialize Beanie with our document models
    await init_beanie(
        database=client.iphone_tracker,
        document_models=[Phone, Batch, Budget, User]
    )

    # Ensure a Budget ledger exists
    budget = await Budget.find_one()
    if not budget:
        await Budget(current_cash=0).insert()
