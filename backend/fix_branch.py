path = "app/models/models.py"
c = open(path, encoding='utf-8').read()

# Show current Branch model
import re
idx = c.find('class Branch(Base):')
end = c.find('\nclass ', idx+1)
print("BEFORE:")
print(c[idx:end])

# Remove state and email from Branch
c = c.replace("    state      = Column(String(100))\n", "")
c = c.replace("    email      = Column(String(150))\n", "")
c = c.replace("    state      = Column(String(100), nullable=True)\n", "")
c = c.replace("    email      = Column(String(150), nullable=True)\n", "")
c = c.replace("    pincode    = Column(String(10))\n", "")
c = c.replace("    pincode    = Column(String(10), nullable=True)\n", "")

open(path, 'w', encoding='utf-8').write(c)

# Verify
c2 = open(path, encoding='utf-8').read()
idx2 = c2.find('class Branch(Base):')
end2 = c2.find('\nclass ', idx2+1)
print("\nAFTER:")
print(c2[idx2:end2])