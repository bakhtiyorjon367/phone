from dataclasses import dataclass
from datetime import datetime, timezone

from models.budget import Budget
from models.phone import Phone
from models.phone import PhoneStatus
from models.settlement import Settlement


@dataclass
class SettleResult:
    total_recovered: int
    current_cash: int


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
    settled_ids = []

    for phone_id in phone_ids:
        phone = await Phone.get(phone_id)
        if phone and phone.status != PhoneStatus.SETTLED:
            # Recover cost + delivery fee + profit
            total_recovered += phone.target_receivable
            phone.status = PhoneStatus.SETTLED
            await phone.save()
            settled_ids.append(phone.id)

    # Inject capital back into budget
    budget.current_cash += total_recovered
    budget.updated_at = datetime.now(timezone.utc)
    await budget.save()

    if settled_ids:
        await Settlement(phone_ids=settled_ids, total_recovered=total_recovered).insert()

    return SettleResult(total_recovered=total_recovered, current_cash=budget.current_cash)
