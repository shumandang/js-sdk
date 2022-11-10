export const IGNORED_FUNCTIONS = [
    
    // it's a property
    'ready',

    // it's a property
    'config',
    
    // it's a class
    'LitNodeClient',

    // This is being used in 'zipAndEncryptString'
    'encryptZip',

    // Below functions gives errors
    'signECDSA',
    'signWithEcdsa',
    'sign_condition_ecdsa',
    'validate_and_sign_ecdsa',
]