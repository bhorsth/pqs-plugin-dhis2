import React from 'react'
import { IFormFieldPluginProps } from './plugin.types'

const Plugin = ({
    values,
    fieldsMetadata
}: IFormFieldPluginProps) => {
    return (
    <div>
        <h1>Plugin</h1>


        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'lightblue' }}> 
            <pre> 
            {JSON.stringify(values, null, 2)} 
            {JSON.stringify(fieldsMetadata, null, 2)} 
            </pre>
        </div>
        <p>Hello.</p>
    </div>  
);
}

export default Plugin