from decimal import Decimal
from typing import Annotated

from pydantic import Field, PlainSerializer

# Stored and calculated as exact Decimals; sent to the frontend as JSON numbers.
_as_number = PlainSerializer(lambda v: float(v), return_type=float, when_used="json")

MoneyIn = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]
QuantityIn = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=3)]

MoneyOut = Annotated[Decimal, _as_number]
QuantityOut = Annotated[Decimal, _as_number]
