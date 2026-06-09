from pydantic import BaseModel, Field
from typing import List, Optional, Union, Any

class ActionItem(BaseModel):
    Action: str
    Date: str
    Name: str

class TicketBase(BaseModel):
    Subject: str
    Breif: str = Field(alias="description", default="")  # handle both 'Breif' and 'description'
    Department: str
    Data_Filled_by: str
    User_Department: str
    Present_Status: str = "New Service Request"
    Old_Status: str = ""
    Ticket_Closed: bool = False
    File: List[str] = []
    Actions_Taken: List[Any] = []  # Can contain lists of dicts or standard dicts
    Input_Date: str

    class Config:
        populate_by_name = True
        json_encoders = {
            # custom encoders if needed
        }

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    Docket_Number: int
    Subject: Optional[str] = None
    Breif: Optional[str] = None
    Department: Optional[str] = None
    Present_Status: Optional[str] = None
    Old_Status: Optional[str] = None
    Ticket_Closed: Optional[bool] = None
    File: Optional[List[str]] = None
    Actions_Taken: Optional[List[Any]] = None
    Data_Edited_by: Optional[str] = None
