from models.budget import Budget
from models.phone import Phone, PhoneStatus


async def dashboard():
    budget = await Budget.find_one()
    phones_in_korea = await Phone.find(Phone.status == PhoneStatus.IN_KOREA).to_list()
    active_foreign_phones = await Phone.find(Phone.status == PhoneStatus.IN_TRANSIT).to_list()
    settled_phones = await Phone.find(Phone.status == PhoneStatus.SETTLED).to_list()

    korea_stock_value = sum(p.purchase_cost for p in phones_in_korea)
    friend_owed_debt = sum(p.target_receivable for p in active_foreign_phones)
    result = {
        "liquid_cash_korea": budget.current_cash,
        "korea_stock_value": korea_stock_value,
        "friend_owed_debt": friend_owed_debt,
        "total_realized_profit": len(settled_phones) * 50000,
        "counts": {
            "in_korea": len(phones_in_korea),
            "abroad_unsettled": len(active_foreign_phones),
            "total_settled": len(settled_phones)
        }}
    return result
