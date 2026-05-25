import os
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env to obtain the public base URL used by users
load_dotenv(Path(__file__).resolve().parents[2] / 'frontend' / '.env')

BASE_URL = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/')


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
