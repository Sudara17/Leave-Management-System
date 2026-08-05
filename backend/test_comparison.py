from decimal import Decimal

balance = Decimal("2.00")
days = 5.0
try:
    if balance < days:
        print("True: balance < days")
    else:
        print("False: balance >= days")
except Exception as e:
    print("Exception:", e)
