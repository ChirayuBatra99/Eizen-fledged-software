from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from db import close_pool, execute_script


def migrate() -> None:
    sql = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
    execute_script(sql)
    print("Schema applied.")


if __name__ == "__main__":
    try:
        migrate()
    except Exception as err:
        print(err)
        raise SystemExit(1)
    finally:
        close_pool()
