import uvicorn
from app import create_app
from app.config import settings

app = create_app()

if __name__ == '__main__':
    # Start the server on port 5050 (or settings.PORT) using uvicorn
    # Use reload=True in debug mode for development ease
    uvicorn.run(
        "Comp:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
