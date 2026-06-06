c = open('app/models/models.py', encoding='utf-8').read()

if 'telehealth_slots' not in c:
    c = c.replace(
        '    telehealth_fee     = Column(Numeric(10, 2), nullable=True)\n',
        '    telehealth_fee     = Column(Numeric(10, 2), nullable=True)\n    telehealth_slots   = Column(JSON, nullable=True)\n'
    )
    open('app/models/models.py', 'w', encoding='utf-8').write(c)
    print('Added telehealth_slots')
else:
    print('telehealth_slots already exists')

# Verify
c2 = open('app/models/models.py', encoding='utf-8').read()
print('telehealth_slots present:', 'telehealth_slots' in c2)
print('languages present:', 'languages' in c2)
print('token_number present:', 'token_number' in c2)