from datetime import datetime, timezone

from models.budget import Budget
from models.phone import Phone
from models.phone import PhoneStatus


async def create(purchase_cost, label):
    budget = await Budget.find_one()

    # Deduct cost from budget immediately
    budget.current_cash -= purchase_cost
    budget.updated_at = datetime.now(timezone.utc)
    await budget.save()

    phone = Phone(label=label, purchase_cost=purchase_cost)
    await phone.insert()


async def settle(phone_ids):
    budget = await Budget.find_one()
    total_recovered = 0

    for phone_id in phone_ids:
        phone = await Phone.get(phone_id)
        if phone and phone.status != PhoneStatus.SETTLED:
            # Recover cost + delivery fee + profit
            total_recovered += phone.target_receivable
            phone.status = PhoneStatus.SETTLED
            await phone.save()

    # Inject capital back into budget
    budget.current_cash += total_recovered
    budget.updated_at = datetime.now(timezone.utc)
    await budget.save()
    result = {total_recovered, budget}
    return result
