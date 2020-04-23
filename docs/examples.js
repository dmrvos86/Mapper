const example1Data = {
    "firstName": "Bob",
    "lastName": "Cooper",
    "age": 42,
    "userType": "Admin"
}

const example2Data = {
    "userData":{
        "firstName": "Bob",
        "lastName": "Cooper"
    },
    "authData":{
        "userType": "Admin"
    } 
}

const example3Data = {
    "userData": {
      "username": "bob@bobville.bb"
    },
    "roles": [
      "pwruser"
    ],
    "consents": [
      "data-processing"
    ]
  }

const example4Data = {
  "rolesAsJsonMap": [
    {
      "userId": "1",
      "department": "dep-A"
    },
    {
      "userId": "2",
      "department": "dep-B"
    },
    {
      "userId": "3",
      "department": "dep-C"
    }
  ]
}

const example5Data = {
  "rolesAsArray": [
    {
      "roleId": "1",
      "userIds": [
        "user1"
      ]
    },
    {
      "roleId": "2",
      "userIds": [
        "user1",
        "user2",
        "user3"
      ]
    }
  ],
  "roles": [
    {
      "roleId": "3",
      "userIds": [
        "user2"
      ]
    }
  ]
}

const example6Data = {
    "contacts": [
      {
        "phone": "xxx-yyyy-zzz"
      },
      {
        "phone": "xxx-yyyy-sss-zzz"
      }
    ]
  }

  const example7Data = {
    "dateOfBirth": "1986-02-01"
  }

  const example8Data = {
    "dynamicData": {"dynamicNumber": 123, "dynamicString": "example"}
  }