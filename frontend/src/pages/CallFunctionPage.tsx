import { useState } from 'react';

export default function CallFunctionPage() {
  const [contractAddress, setContractAddress] = useState('');
  const [functionName, setFunctionName] = useState('');
  const [parameters, setParameters] = useState<string[]>(['']);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleParamChange = (index: number, value: string) => {
    const newParams = [...parameters];
    newParams[index] = value;
    setParameters(newParams);
  };

  const addParam = () => setParameters([...parameters, '']);
  const removeParam = (index: number) =>
    setParameters(parameters.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/contract/call-function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_address: contractAddress,
          function_name: functionName,
          parameters,
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({ error: 'Erro ao chamar função' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto mt-10 p-6 bg-white rounded shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-[#002d72]">Call Function</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Contract Address */}
        <div>
          <label className="block mb-1 font-medium">Contract Address</label>
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#002d72]"
            placeholder="0x..."
            required
          />
        </div>

        {/* Function Name */}
        <div>
          <label className="block mb-1 font-medium">Function Name</label>
          <input
            type="text"
            value={functionName}
            onChange={(e) => setFunctionName(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#002d72]"
            placeholder="balanceOf"
            required
          />
        </div>

        {/* Parameters */}
        <div>
          <label className="block mb-2 font-medium">Parameters</label>
          <div className="flex flex-col gap-2">
            {parameters.map((param, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={param}
                  onChange={(e) => handleParamChange(index, e.target.value)}
                  className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#002d72]"
                  placeholder="parameter value"
                />
                <button
                  type="button"
                  onClick={() => removeParam(index)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <br></br>
          
          <button
            type="button"
            onClick={addParam}
            className="mt-2 px-3 py-2 bg-[#ff6600] text-white rounded hover:bg-[#e65c00] transition"
          >
            Add Parameter
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-[#002d72] text-white font-semibold rounded hover:bg-[#001f55] transition disabled:opacity-50"
        >
          {loading ? 'Calling...' : 'Call Function'}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded max-h-80 overflow-auto">
          <h2 className="font-semibold mb-3 text-[#002d72] text-lg">Result:</h2>

          {typeof result === 'object' ? (
            <ul className="space-y-2">
              {Object.entries(result).map(([key, value]) => (
                <li key={key} className="p-2 bg-white border rounded shadow-sm break-words">
                  <span className="font-medium">{key}:</span>{' '}
                  <span className="text-gray-700">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : value.toString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-700">{result.toString()}</p>
          )}
        </div>
      )}
    </div>
  );
}
